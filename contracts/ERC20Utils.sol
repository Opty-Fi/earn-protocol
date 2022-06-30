// SPDX-License-Identifier: MIT

/*solhint-disable avoid-low-level-calls */

pragma solidity ^0.8.14;

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { IERC2612 } from '@solidstate/contracts/token/ERC20/permit/IERC2612.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

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

library ERC20Utils {
    using SafeERC20 for IERC20;

    address private constant ETH_ADDRESS =
        address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    uint256 private constant MAX_UINT = type(uint256).max;

    function ethAddress() internal pure returns (address) {
        return ETH_ADDRESS;
    }

    function maxUint() internal pure returns (uint256) {
        return MAX_UINT;
    }

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

    function transferTokens(
        address token,
        address payable destination,
        uint256 amount
    ) internal {
        if (amount > 0) {
            if (token == ETH_ADDRESS) {
                (bool result, ) = destination.call{ value: amount, gas: 10000 }(
                    ''
                );
                require(result, 'Failed to transfer Ether');
            } else {
                IERC20(token).safeTransfer(destination, amount);
            }
        }
    }

    function tokenBalance(address token, address account)
        internal
        view
        returns (uint256)
    {
        if (token == ETH_ADDRESS) {
            return account.balance;
        } else {
            return IERC20(token).balanceOf(account);
        }
    }

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
