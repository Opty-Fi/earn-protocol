// SPDX-License-Identifier: MIT

/*solhint-disable avoid-low-level-calls */

pragma solidity ^0.8.15;

import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';
import { IERC2612 } from '@solidstate/contracts/token/ERC20/permit/IERC2612.sol';
import { SafeERC20 } from '@solidstate/contracts/utils/SafeERC20.sol';

/**
 * @title Legacy ERC20Permit interface
 * @author OptyFi
 */
interface IERC20PermitLegacy {
    function permit(
        address holder,
        address spender,
        uint256 nonce,
        uint256 expiry,
        bool allowed,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

/**
 * @title Utils for ERC20
 * @author OptyFi
 */
library ERC20Utils {
    using SafeERC20 for IERC20;

    address private constant ETH_ADDRESS =
        address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    uint256 private constant MAX_UINT = type(uint256).max;

    /**
     * @notice returns ETH addrews
     * @return address of ETH
     */
    function ethAddress() internal pure returns (address) {
        return ETH_ADDRESS;
    }

    /**
     * @notice returns maximum value of uint256
     * @return uint256 maximum value
     */
    function maxUint() internal pure returns (uint256) {
        return MAX_UINT;
    }

    /**
     * @notice increases the allowance of a given address to MAX_UINT
     * @param _addressToApprove the address to approve
     * @param _token the address of the token to approve
     * @param _amount the amount to approve
     */
    function approve(
        address _addressToApprove,
        address _token,
        uint256 _amount
    ) internal {
        if (_token != ETH_ADDRESS) {
            IERC20 token_ = IERC20(_token);

            uint256 _allowance = token_.allowance(
                address(this),
                _addressToApprove
            );

            if (_allowance < _amount) {
                token_.safeApprove(_addressToApprove, uint256(0));
                token_.safeIncreaseAllowance(_addressToApprove, MAX_UINT);
            }
        }
    }

    /**
     * @notice transfers tokens to a given address
     * @param _token address to transfer
     * @param _destination address to transfer to
     * @param _amount of token to transfer
     */
    function transferTokens(
        address _token,
        address payable _destination,
        uint256 _amount
    ) internal {
        if (_amount > 0) {
            if (_token == ETH_ADDRESS) {
                (bool result, ) = _destination.call{
                    value: _amount,
                    gas: 10000
                }('');
                require(result, 'Failed to transfer Ether');
            } else {
                IERC20(_token).safeTransfer(_destination, _amount);
            }
        }
    }

    /**
     * @notice returns the balance of a given token
     * @param _token address to return balance of
     * @param _account address to check balance of
     * @return uint256
     */
    function tokenBalance(address _token, address _account)
        internal
        view
        returns (uint256)
    {
        if (_token == ETH_ADDRESS) {
            return _account.balance;
        } else {
            return IERC20(_token).balanceOf(_account);
        }
    }

    /**
     * @notice checks whether a token is permitted
     * @param _token address to check
     * @param _permit data
     */
    function permit(address _token, bytes memory _permit) internal {
        if (_permit.length == 32 * 7) {
            (bool success, ) = _token.call(
                abi.encodePacked(IERC2612.permit.selector, _permit)
            );
            require(success, 'Permit failed');
        }

        if (_permit.length == 32 * 8) {
            (bool success, ) = _token.call(
                abi.encodePacked(IERC20PermitLegacy.permit.selector, _permit)
            );
            require(success, 'Legacy Permit failed');
        }
    }
}
