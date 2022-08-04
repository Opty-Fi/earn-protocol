// SPDX-License-Identifier: MIT

//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-0.8.x/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.8.x/access/Ownable.sol";
import { IOptyFiZapper } from "./IOptyFiZapper.sol";
import { ISwap } from "../optyfi-swapper/contracts/swap/ISwap.sol";
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

    address public immutable WETH;
    ISwap public swapper;

    constructor(address _swapper, address _WETH) {
        WETH = _WETH;
        swapper = ISwap(_swapper);
    }

    function zapInETH(DataTypes.ZapData memory _zapParams) external payable override {
        uint256 receivedAmount = msg.value;
        IWETH(WETH).deposit{ value: receivedAmount }();
        address underlyingToken = _getUnderlyingToken(_zapParams.vault);

        if (underlyingToken != WETH) {
            SwapTypes.SwapData memory swapData =
                SwapTypes.SwapData(
                    WETH,
                    underlyingToken,
                    receivedAmount,
                    _zapParams.toAmount,
                    _zapParams.callees,
                    _zapParams.exchangeData,
                    _zapParams.startIndexes,
                    _zapParams.values,
                    payable(address(this)),
                    _zapParams.permit,
                    _zapParams.deadline
                );

            (receivedAmount, ) = swapper.swap(swapData);
        }

        IVault(_zapParams.vault).userDepositVault(
            msg.sender,
            receivedAmount,
            _zapParams.permit,
            _zapParams.accountsProof,
            _zapParams.codesProof
        );
    }

    function zapIn(
        address _token,
        uint256 _amount,
        DataTypes.ZapData memory _zapParams
    ) external override {
        address underlyingToken = _getUnderlyingToken(_zapParams.vault);
        uint256 receivedAmount = _amount;

        if (underlyingToken != _token) {
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

            (receivedAmount, ) = swapper.swap(swapData);
        }

        IVault(_zapParams.vault).userDepositVault(
            msg.sender,
            receivedAmount,
            _zapParams.permit,
            _zapParams.accountsProof,
            _zapParams.codesProof
        );
    }

    function zapOut(
        address _token,
        uint256 _amount,
        DataTypes.ZapData memory _zapParams
    ) external override {
        address underlyingToken = _getUnderlyingToken(_zapParams.vault);

        IVault(_zapParams.vault).userWithdrawVault(
            address(this),
            _amount,
            _zapParams.accountsProof,
            _zapParams.codesProof
        );

        if (underlyingToken != _token) {
            SwapTypes.SwapData memory swapData =
                SwapTypes.SwapData(
                    underlyingToken,
                    _token,
                    _amount,
                    _zapParams.toAmount,
                    _zapParams.callees,
                    _zapParams.exchangeData,
                    _zapParams.startIndexes,
                    _zapParams.values,
                    payable(msg.sender),
                    _zapParams.permit,
                    _zapParams.deadline
                );

            swapper.swap(swapData);
        }
    }

    function setSwapper(address _swapper) external override onlyOwner {
        swapper = ISwap(_swapper);
    }

    function _getUnderlyingToken(address _vault) internal returns (address) {
        return IVault(_vault).underlyingToken();
    }
}
