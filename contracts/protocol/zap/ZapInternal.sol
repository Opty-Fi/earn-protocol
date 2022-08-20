//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-0.8.x/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts-0.8.x/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.8.x/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import { Errors } from "./Errors.sol";
import { ZapStorage } from "./ZapStorage.sol";
import { ISwapper } from "../optyfi-swapper/contracts/swap/ISwapper.sol";
import { DataTypes as SwapTypes } from "../optyfi-swapper/contracts/swap/DataTypes.sol";
import { DataTypes } from "./DataTypes.sol";

interface IVault {
    /**
     * @notice Deposit underlying tokens to the vault
     * @dev Mint the shares right away as per oracle based price per full share value
     * @param _beneficiary the address of the deposit beneficiary,
     *        if _beneficiary = address(0) => _beneficiary = msg.sender
     * @param _userDepositUT Amount in underlying token
     * @param _permitParams permit parameters: amount, deadline, v, s, r
     * @param _accountsProof merkle proof for caller
     * @param _codesProof merkle proof for code hash if caller is smart contract
     */
    function userDepositVault(
        address _beneficiary,
        uint256 _userDepositUT,
        bytes calldata _permitParams,
        bytes32[] calldata _accountsProof,
        bytes32[] calldata _codesProof
    ) external returns (uint256);

    /**
     * @notice redeems the vault shares and transfers underlying token to `_beneficiary`
     * @dev Burn the shares right away as per oracle based price per full share value
     * @param _receiver the address which will receive the underlying tokens
     * @param _userWithdrawVT amount in vault token
     * @param _accountsProof merkle proof for caller
     * @param _codesProof merkle proof for code hash if caller is smart contract
     */
    function userWithdrawVault(
        address _receiver,
        uint256 _userWithdrawVT,
        bytes32[] calldata _accountsProof,
        bytes32[] calldata _codesProof
    ) external returns (uint256);

    /**
     * @dev the vault underlying token contract address
     */
    function underlyingToken() external returns (address);
}

/**
 * @title OptyFiZapper
 * @author OptyFi
 */
abstract contract ZapInternal {
    using ZapStorage for ZapStorage.Layout;
    using SafeERC20 for IERC20;

    address public constant ETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    /**
     * @dev performs an arbitrary swap of a given token or ETH to deposit in a OptyFi Vault
     * @param _token the address of the input token
     * @param _amount input token amount to deposit
     * @param _permitParams ERC2612 permit params
     * @param _zapParams the zapParams for the zap to be performed
     * @return sharesReceived shares received from the vault deposit
     */
    function _zapIn(
        address _token,
        uint256 _amount,
        bytes memory _permitParams,
        DataTypes.ZapData memory _zapParams
    ) internal returns (uint256 sharesReceived) {
        address vaultUnderlyingToken = _vaultUnderlyingToken(_zapParams.vault);
        if (vaultUnderlyingToken == _token) {
            revert Errors.InvalidToken();
        }

        ISwapper swapper = _getSwapper();

        if (_token != ETH) {
            _permit(_token, _permitParams);
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
            _approveTokenIfNeeded(_token, swapper.tokenTransferProxy(), _amount);
        }

        SwapTypes.SwapData memory swapData = SwapTypes.SwapData(
            _token,
            vaultUnderlyingToken,
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

        (uint256 receivedAmount, uint256 unused) = swapper.swap{ value: msg.value }(swapData);
        if (unused > 0) {
            IERC20(_token).safeTransfer(msg.sender, unused);
        }

        _approveTokenIfNeeded(vaultUnderlyingToken, _zapParams.vault, receivedAmount);

        sharesReceived = IVault(_zapParams.vault).userDepositVault(
            msg.sender,
            receivedAmount,
            _zapParams.permit,
            _zapParams.accountsProof,
            _zapParams.codesProof
        );
    }

    /**
     * @dev redeems the vault shares and performs an arbitrary swap
     * from the OptyFi Vault underlying token to any given token
     * @param _token the address of the input token
     * @param _amount input token amount to deposit
     * @param _permitParams ERC2612 permit params
     * @param _zapParams the zapParams for the zap to be performed
     * @return receivedAmount amount of output tokens received
     */
    function _zapOut(
        address _token,
        uint256 _amount,
        bytes memory _permitParams,
        DataTypes.ZapData memory _zapParams
    ) internal returns (uint256 receivedAmount) {
        address vaultUnderlyingToken = _vaultUnderlyingToken(_zapParams.vault);
        if (vaultUnderlyingToken == _token) {
            revert Errors.InvalidToken();
        }

        _permit(_zapParams.vault, _permitParams);
        ISwapper swapper = _getSwapper();

        IERC20(_zapParams.vault).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 swapAmount = IVault(_zapParams.vault).userWithdrawVault(
            address(this),
            _amount,
            _zapParams.accountsProof,
            _zapParams.codesProof
        );

        _approveTokenIfNeeded(vaultUnderlyingToken, swapper.tokenTransferProxy(), swapAmount);

        SwapTypes.SwapData memory swapData = SwapTypes.SwapData(
            vaultUnderlyingToken,
            _token,
            swapAmount,
            _zapParams.toAmount,
            _zapParams.callees,
            _zapParams.exchangeData,
            _zapParams.startIndexes,
            _zapParams.values,
            payable(msg.sender),
            _zapParams.permit,
            _zapParams.deadline
        );

        uint256 unused;
        (receivedAmount, unused) = swapper.swap(swapData);
        if (unused > 0) {
            IERC20(_token).safeTransfer(msg.sender, unused);
        }
    }

    /**
     * @dev set swapper address
     * @param _l the zap layout struct
     * @param _swapper swapper address
     */
    function _setSwapper(ZapStorage.Layout storage _l, address _swapper) internal {
        _l.swapper = ISwapper(_swapper);
    }

    /**
     * @dev get swapper address
     */
    function _getSwapper() internal view returns (ISwapper swapper) {
        swapper = ZapStorage.layout().swapper;
    }

    /**
     * @dev function to get the underlying token of the OptyFi Vault
     */
    function _vaultUnderlyingToken(address _vault) internal returns (address) {
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
            if (!success) {
                revert Errors.PermitFailed();
            }
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
