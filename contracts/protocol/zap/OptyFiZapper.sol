//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-0.8.x/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts-0.8.x/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.8.x/access/Ownable.sol";
import { IOptyFiZapper } from "./IOptyFiZapper.sol";
import { ISwapper } from "../optyfi-swapper/contracts/swap/ISwapper.sol";
import { DataTypes as SwapTypes } from "../optyfi-swapper/contracts/swap/DataTypes.sol";
import { DataTypes } from "./DataTypes.sol";

interface IWETH is IERC20 {
    function deposit() external payable;

    function withdraw(uint256 wad) external;
}

interface IVault is IERC20 {
    function userDepositVault(
        address _beneficiary,
        uint256 _userDepositUT,
        bytes calldata _permitParams,
        bytes32[] calldata _accountsProof,
        bytes32[] calldata _codesProof
    ) external returns (uint256);

    function userWithdrawVault(
        address _receiver,
        uint256 _userWithdrawVT,
        bytes32[] calldata _accountsProof,
        bytes32[] calldata _codesProof
    ) external returns (uint256);

    function underlyingToken() external returns (address);
}

/**
 * @title OptyFiZapper
 * @author OptyFi
 */
contract OptyFiZapper is IOptyFiZapper, Ownable {
    using SafeERC20 for IERC20;

    address public constant ETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    ISwapper public swapper;

    constructor(address _swapper) {
        swapper = ISwapper(_swapper);
    }

    /**
     * @inheritdoc IOptyFiZapper
     */
    function zapIn(
        address _token,
        uint256 _amount,
        bytes memory _permitParams,
        DataTypes.ZapData memory _zapParams
    ) external payable override returns (uint256) {
        address underlyingToken = _getUnderlyingToken(_zapParams.vault);
        require(underlyingToken != _token, "Invalid Token");

        if (_token != ETH) {
            _permit(_token, _permitParams);
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
            _approveTokenIfNeeded(_token, swapper.tokenTransferProxy(), _amount);
        }

        SwapTypes.SwapData memory swapData =
            SwapTypes.SwapData(
                _token,
                underlyingToken,
                _amount,
                _zapParams.toAmount,
                _zapParams.callees,
                _zapParams.exchangeData,
                _zapParams.startIndexes,
                _zapParams.values,
                payable(address(this)),
                _zapParams.permit,
                _zapParams.deadline
            );

        (uint256 receivedAmount, uint256 returnedBalance) = swapper.swap{ value: msg.value }(swapData);
        if (returnedBalance > 0) {
            IERC20(_token).safeTransfer(msg.sender, returnedBalance);
        }

        _approveTokenIfNeeded(underlyingToken, _zapParams.vault, receivedAmount);

        uint256 sharesReceived =
            IVault(_zapParams.vault).userDepositVault(
                msg.sender,
                receivedAmount,
                _zapParams.permit,
                _zapParams.accountsProof,
                _zapParams.codesProof
            );

        return sharesReceived;
    }

    /**
     * @inheritdoc IOptyFiZapper
     */
    function zapOut(
        address _token,
        uint256 _amount,
        bytes memory _permitParams,
        DataTypes.ZapData memory _zapParams
    ) external override returns (uint256) {
        address underlyingToken = _getUnderlyingToken(_zapParams.vault);
        require(underlyingToken != _token, "Invalid Token");

        _permit(_zapParams.vault, _permitParams);

        IERC20(_zapParams.vault).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 amountToSwap =
            IVault(_zapParams.vault).userWithdrawVault(
                address(this),
                _amount,
                _zapParams.accountsProof,
                _zapParams.codesProof
            );

        _approveTokenIfNeeded(underlyingToken, swapper.tokenTransferProxy(), amountToSwap);

        SwapTypes.SwapData memory swapData =
            SwapTypes.SwapData(
                underlyingToken,
                _token,
                amountToSwap,
                _zapParams.toAmount,
                _zapParams.callees,
                _zapParams.exchangeData,
                _zapParams.startIndexes,
                _zapParams.values,
                payable(msg.sender),
                _zapParams.permit,
                _zapParams.deadline
            );

        (uint256 receivedAmount, uint256 returnedBalance) = swapper.swap(swapData);
        if (returnedBalance > 0) {
            IERC20(_token).safeTransfer(msg.sender, returnedBalance);
        }

        return receivedAmount;
    }

    /**
     * @inheritdoc IOptyFiZapper
     */
    function setSwapper(address _swapper) external override onlyOwner {
        swapper = ISwapper(_swapper);
    }

    /**
     * @inheritdoc IOptyFiZapper
     */
    function getSwapper() external view returns (address) {
        return address(swapper);
    }

    /**
     * @dev function to get the underlying token of the OptyFi Vault
     */
    function _getUnderlyingToken(address _vault) internal returns (address) {
        return IVault(_vault).underlyingToken();
    }

    /**
     * @dev function to call token permit method of extended ERC20
     * @param _token address of the token to call
     * @param _permitParams raw data of the call `permit` of the token
     */
    function _permit(address _token, bytes memory _permitParams) internal {
        if (_permitParams.length == 32 * 7) {
            (bool success, ) = _token.call(abi.encodePacked(IERC20Permit.permit.selector, _permitParams));
            require(success, "Permit failed");
        }
    }

    /**
     * @dev function to increase allowance
     * @param _token address of the token to call
     * @param _spender address of the spender
     * @param _amount transfer amount
     */
    function _approveTokenIfNeeded(
        address _token,
        address _spender,
        uint256 _amount
    ) private {
        if (IERC20(_token).allowance(address(this), _spender) < _amount) {
            IERC20(_token).safeApprove(_spender, type(uint256).max);
        }
    }
}
