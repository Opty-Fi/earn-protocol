// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "..//ERC20/IERC20.sol";

interface IAToken {
    function redeem(uint256 amount) external;
    function isTransferAllowed(address user, uint256 amount) external view returns(bool);
    function underlyingAssetAddress() external view returns(address);
}
