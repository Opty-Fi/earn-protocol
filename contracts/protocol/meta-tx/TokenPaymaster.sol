// SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

//contracts
import { ERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/ERC20.sol";
import { BasePaymaster } from "./GSN/BasePaymaster.sol";

//libraries
import { SafeMath } from "@openzeppelin/contracts-0.8.x/utils/math/SafeMath.sol";
import { GsnTypes } from "./GSN/libraries/GsnTypes.sol";

//interfaces
import { IOptyFiOracle } from "../optyfi-oracle/contracts/interfaces/IOptyFiOracle.sol";
import { IERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import { IERC20Permit } from "@openzeppelin/contracts-0.8.x/token/ERC20/extensions/draft-IERC20Permit.sol";
import { IERC20PermitLegacy } from "../../interfaces/opty/IERC20PermitLegacy-0.8.x.sol";
import { IUniswapV2Router01 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";
import { ISwapRouter } from "../../interfaces/uniswap/ISwapRouter.sol";

/**
 * @title A Token-based paymaster
 * @author opty.fi
 * @notice - each request is paid for by the caller.
 *         - preRelayedCall - pre-pay the maximum possible price for the tx
 *         - postRelayedCall - refund the caller for the unused gas
 */
contract TokenPaymaster is BasePaymaster {
    using SafeMath for uint256;

    /** @dev ETH address */
    address private constant ETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    /** WETH ERC20 token address */
    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    struct PaymasterData {
        address token;
        address dex;
        bool isUniV3;
        bytes permit;
        bytes approve;
        bytes pathUniv3;
        address[] pathUniV2;
        uint256 deadline;
    }

    IOptyFiOracle optyFiOracle;
    uint256 public gasUsedByPost;

    constructor(address _optyFiOracle) {
        optyFiOracle = IOptyFiOracle(_optyFiOracle);
    }

    function versionPaymaster() external view virtual override returns (string memory) {
        return "2.2.3+opengsn.token.ipaymaster";
    }

    /**
     * @notice set gas used by postRelayedCall, for proper gas calculation.
     *         You can use TokenGasCalculator to calculate these values (they depend on actual code of postRelayedCall,
     *         but also the gas usage of the token and the swap)
     * @param _gasUsedByPost gas used by postRelayedCall
     */
    function setPostGasUsage(uint256 _gasUsedByPost) external onlyOwner {
        gasUsedByPost = _gasUsedByPost;
    }

    /**
     * @notice Sets the OptyFi Oracle contract
     * @param _optyFiOracle OptyFi Oracle contract address
     */
    function setOptyFiOracle(address _optyFiOracle) external onlyOwner {
        optyFiOracle = IOptyFiOracle(_optyFiOracle);
    }

    /**
     * @notice return the payer of a given RelayRequest
     * @param _relayRequest GSN RelayRequest
     */
    function getPayer(GsnTypes.RelayRequest calldata _relayRequest) public view virtual returns (address) {
        return _relayRequest.request.from;
    }

    /**
     * @dev get the user's input token
     * @param _paymasterData paymaster data containing the swap data
     */
    function _getToken(bytes memory _paymasterData) internal view returns (IERC20 token) {
        PaymasterData memory paymasterData = abi.decode(_paymasterData, (PaymasterData));
        token = IERC20(paymasterData.token);
    }

    /**
     * @dev decode paymasterData
     * @param _paymasterData swap data (token, callees, exchangeData, startIndexes, values, permit, deadline)
     */
    function _getPaymasterData(bytes memory _paymasterData) internal view returns (PaymasterData memory paymasterData) {
        paymasterData = abi.decode(_paymasterData, (PaymasterData));
    }

    /**
     * @dev return the pre charge value
     * @param _token token used to pay for gas
     * @param _relayRequest forward request and relay data
     * @param _maxPossibleGas max possible gas to spent
     */
    function _calculatePreCharge(
        address _token,
        GsnTypes.RelayRequest calldata _relayRequest,
        uint256 _maxPossibleGas
    ) internal view returns (address payer, uint256 tokenPreCharge) {
        payer = this.getPayer(_relayRequest);
        uint256 ethMaxCharge = relayHub.calculateCharge(_maxPossibleGas, _relayRequest.relayData);
        ethMaxCharge += _relayRequest.request.value;
        tokenPreCharge = _getETHInToken(_token, ethMaxCharge);
    }

    /**
     * @dev calculates pre charge value and transfers to paymaster
     * @param _relayRequest forward request and relay data
     * @param _signature payer signature
     * @param _approvalData token approvals
     * @param _maxPossibleGas max possible gas to spent
     */
    function _preRelayedCall(
        GsnTypes.RelayRequest calldata _relayRequest,
        bytes calldata _signature,
        bytes calldata _approvalData,
        uint256 _maxPossibleGas
    ) internal virtual override returns (bytes memory context, bool revertOnRecipientRevert) {
        (_signature);
        IERC20 token = _getToken(_relayRequest.relayData.paymasterData);
        _permit(address(token), _approvalData);
        (address payer, uint256 tokenPrecharge) = _calculatePreCharge(address(token), _relayRequest, _maxPossibleGas);
        bool success = token.transferFrom(payer, address(this), tokenPrecharge);
        return (abi.encode(payer, tokenPrecharge, token), false);
    }

    /**
     * @dev calculates actual gas spent, refund relayer for gas the spent, and refund payer for unspent tokens
     * @param _context context bytes
     * @param _gasUseWithoutPost actual gas used without post relayed call cost
     * @param _relayData relay data
     */
    function _postRelayedCall(
        bytes calldata _context,
        bool,
        uint256 _gasUseWithoutPost,
        GsnTypes.RelayData calldata _relayData
    ) internal virtual override {
        (address payer, uint256 tokenPrecharge, IERC20 token) = abi.decode(_context, (address, uint256, IERC20));
        _postRelayedCallInternal(payer, tokenPrecharge, 0, _gasUseWithoutPost, _relayData, token);
    }

    /**
     * @dev calculates actual gas spent, refund relayer for gas the spent, and refund payer for unspent tokens
     * @param _payer original payer address
     * @param _tokenPrecharge max gas spent in token unit
     * @param _valueRequested value requested
     * @param _gasUseWithoutPost actual gas used without post relayed call cost
     * @param _relayData relay data
     * @param _token token used to pay for gas
     */
    function _postRelayedCallInternal(
        address _payer,
        uint256 _tokenPrecharge,
        uint256 _valueRequested,
        uint256 _gasUseWithoutPost,
        GsnTypes.RelayData calldata _relayData,
        IERC20 _token
    ) internal {
        uint256 ethActualCharge = relayHub.calculateCharge(_gasUseWithoutPost.add(gasUsedByPost), _relayData);
        uint256 tokenActualCharge = _getETHInToken(address(_token), _valueRequested.add(ethActualCharge));
        uint256 tokenRefund = _tokenPrecharge.sub(tokenActualCharge);
        _refundPayer(_payer, _token, tokenRefund);
        _depositProceedsToHub(_payer, ethActualCharge, _relayData.paymasterData);
        emit TokensCharged(_gasUseWithoutPost, gasUsedByPost, ethActualCharge, tokenActualCharge);
    }

    /**
     * @dev refund payer for the unspent tokens
     * @param _payer address
     * @param _token token used to pay for gas
     * @param _tokenRefund amount to refund
     */
    function _refundPayer(
        address _payer,
        IERC20 _token,
        uint256 _tokenRefund
    ) private {
        require(_token.transfer(_payer, _tokenRefund), "failed refund");
    }

    /**
     * @dev refund relayer for gas the spent
     * @param _ethActualCharge gas cost paid by the relayer
     * @param _paymasterData swap data (token, callees, exchangeData, startIndexes, values, permit, deadline)
     */
    function _depositProceedsToHub(
        address _payer,
        uint256 _ethActualCharge,
        bytes calldata _paymasterData
    ) private {
        uint256 receivedAmount = _swapToETH(_payer, _ethActualCharge, _paymasterData);
        relayHub.depositFor{ value: receivedAmount }(address(this));
    }

    /**
     * @dev swap token for ETH
     * @param _ethActualCharge gas cost paid by the relayer
     * @param _paymasterData swap data (token, router, permit)
     * @return receivedAmount amount received from the swap
     */
    function _swapToETH(
        address _payer,
        uint256 _ethActualCharge,
        bytes calldata _paymasterData
    ) private returns (uint256 receivedAmount) {
        PaymasterData memory pd = _getPaymasterData(_paymasterData);
        _approve(pd.token, pd.approve);
        _permit(pd.token, pd.permit);
        uint256 balanceBefore = address(this).balance;
        if (pd.isUniV3) {
            ISwapRouter(pd.dex).exactInput(
                ISwapRouter.ExactInputParams({
                    path: pd.pathUniv3,
                    recipient: address(this),
                    deadline: pd.deadline,
                    amountIn: _getETHInToken(pd.token, _ethActualCharge).mul(101).div(100),
                    amountOutMinimum: 0 //_ethActualCharge
                })
            );
        } else {
            IUniswapV2Router01(pd.dex).swapExactTokensForETH(
                _getETHInToken(pd.token, _ethActualCharge).mul(101).div(100),
                0, //_ethActualCharge,
                pd.pathUniV2,
                address(this),
                pd.deadline
            );
        }
        receivedAmount = address(this).balance.sub(balanceBefore);
    }

    /**
     * @dev Get the expected amount to receive of _token1 after swapping _token0
     * @param _swapInAmount Amount of _token0 to be swapped for _token1
     * @param _token0 Contract address of one of the liquidity pool's underlying tokens
     * @param _token1 Contract address of one of the liquidity pool's underlying tokens
     * @return _swapOutAmount oracle price
     */
    function _calculateSwapOutAmount(
        uint256 _swapInAmount,
        address _token0,
        address _token1
    ) internal view returns (uint256 _swapOutAmount) {
        uint256 price = optyFiOracle.getTokenPrice(_token0, _token1);
        require(price > uint256(0), "!price");
        uint256 decimals0 = ERC20(_token0).decimals();
        uint256 decimals1 = ERC20(_token1).decimals();
        _swapOutAmount = ((_swapInAmount * price * 10**decimals1) / 10**(18 + decimals0));
    }

    /**
     * @dev Get the _token equivalent amount of WETH
     * @param _token token address
     * @param _amount amount in WETH
     * @return amount token equivalent amount
     */
    function _getETHInToken(address _token, uint256 _amount) internal view returns (uint256 amount) {
        _token == WETH ? amount = _amount : amount = _calculateSwapOutAmount(_amount, WETH, _token);
    }

    /* solhint-disable avoid-low-level-calls*/
    /**
     * @dev execute the permit according to the permit data
     * @param _permitData data
     */
    function _permit(address _token, bytes memory _permitData) internal {
        if (_permitData.length == 32 * 7) {
            (bool success, ) = _token.call(abi.encodePacked(IERC20Permit.permit.selector, _permitData));
            require(success, "PERMIT_FAILED");
        }

        if (_permitData.length == 32 * 8) {
            (bool success, ) = _token.call(abi.encodePacked(IERC20PermitLegacy.permit.selector, _permitData));
            require(success, "PERMIT_LEGACY_FAILED");
        }
    }

    /**
     * @dev execute the approve according to the approve data
     * @param _approveData data
     */
    function _approve(address _token, bytes memory _approveData) internal {
        if (_approveData.length < 32 * 7) {
            (bool success, ) = _token.call(abi.encodePacked(IERC20.approve.selector, _approveData));
            require(success, "APPROVE_FAILED");
        }
    }

    function _verifyPaymasterData(GsnTypes.RelayRequest calldata relayRequest) internal view override {
        require(relayRequest.relayData.paymasterData.length == 544, "invalid paymasterData");
    }

    receive() external payable override {
        emit Received(msg.value);
    }

    event Received(uint256 eth);

    event TokensCharged(
        uint256 gasUseWithoutPost,
        uint256 gasJustPost,
        uint256 ethActualCharge,
        uint256 tokenActualCharge
    );
}
