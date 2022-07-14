// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { OwnableInternal } from '@solidstate/contracts/access/ownable/OwnableInternal.sol';
import { OwnableStorage } from '@solidstate/contracts/access/ownable/OwnableInternal.sol';
import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@solidstate/contracts/utils/SafeERC20.sol';
import { AddressUtils } from '@solidstate/contracts/utils/AddressUtils.sol';

import { ITokenTransferProxy } from './ITokenTransferProxy.sol';

/**
 * @dev Allows owner of the contract to transfer tokens on behalf of user.
 * User will need to approve this contract to spend tokens on his/her behalf
 * on optyfi vault
 */
import 'hardhat/console.sol';

contract TokenTransferProxy is OwnableInternal, ITokenTransferProxy {
    using SafeERC20 for IERC20;
    using AddressUtils for address;

    constructor() {
        OwnableStorage.layout().owner = msg.sender;
    }

    /**
     * @inheritdoc ITokenTransferProxy
     */
    function transferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) external onlyOwner {
        console.log('isContract ttfp: ', from.isContract());
        console.log('from in ttfp: ', from);
        require(from == tx.origin || from.isContract(), 'Invalid from address'); //is this required?
        uint256 fromBalance = IERC20(token).balanceOf(from);
        console.log('fromBalance ttfp: ', fromBalance);
        console.log('amount ttfp: ', amount);
        console.log('to ttfp: ', to);
        console.log('ttfp address: ', address(this));
        IERC20(token).safeTransferFrom(from, to, amount);
    }
}
