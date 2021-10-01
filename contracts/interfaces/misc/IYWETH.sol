// SPDX-License-Identifier:MIT
pragma solidity 0.6.12;

interface IYWETH {
    function depositETH() external payable;

    function transfer(address recipient, uint256 amount) external;

    function balanceOf(address _holder) external view returns (uint256);
}
