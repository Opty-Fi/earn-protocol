// SPDX-License-Identifier:MIT

pragma solidity =0.8.11;

//  interfaces
import { IERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import { IOptyFiOracle } from "../../utils/optyfi-oracle/contracts/interfaces/IOptyFiOracle.sol";
import { IERC20Metadata } from "@openzeppelin/contracts-0.8.x/token/ERC20/extensions/IERC20Metadata.sol";

// libraries

contract VaultHelper {
    function pureFunctionUint256(uint256 _arg) external pure returns (uint256) {
        return _arg;
    }

    function getTokenOutPrice_OptyFiOracle(
        IOptyFiOracle _optyFiOracle,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) external view returns (uint256) {
        uint256 _price = _optyFiOracle.getTokenPrice(_tokenIn, _tokenOut);
        require(_price > uint256(0), "!price");
        uint256 decimalsIn = uint256(IERC20Metadata(_tokenIn).decimals());
        uint256 decimalsOut = uint256(IERC20Metadata(_tokenOut).decimals());
        return (_amountIn * _price * 10**decimalsOut) / 10**(18 + decimalsIn);
    }

    function getMinimumExpectedTokenOutPrice(uint256 _amountOut, uint256 _slippage) external pure returns (uint256) {
        return (_amountOut * (10000 - _slippage)) / 10000;
    }

    function getERC20Balance(IERC20 _token, address _owner) external view returns (uint256) {
        return _token.balanceOf(_owner);
    }
}
