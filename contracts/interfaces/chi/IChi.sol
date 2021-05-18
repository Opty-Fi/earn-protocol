// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Interface of the Opty.fi Vaults.
 */
interface IChi is IERC20 {
    function mint(uint256 value) external;
}
