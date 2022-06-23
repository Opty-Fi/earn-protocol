// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import { IArbitrarySwapper } from './IArbitrarySwapper.sol';
import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@solidstate/contracts/utils/SafeERC20.sol';

contract ArbitrarySwapper is IArbitrarySwapper {
    using SafeERC20 for IERC20;

    /**
     * @inheritdoc IArbitrarySwapper
     */
    function swap(
        address _inputToken,
        uint256 _inputTokenAmount,
        address _outputToken,
        uint256 _outputTokenAmountMin,
        address _target,
        address _receiver,
        bytes calldata _data
    ) external returns (uint256 outputAmount) {
        IERC20(_inputToken).safeApprove(_target, _inputTokenAmount);

        (bool success, ) = _target.call(_data);
        require(success, 'Swapper: external swap failed');

        outputAmount = IERC20(_outputToken).balanceOf(address(this));

        require(
            outputAmount >= _outputTokenAmountMin,
            'Swapper: output token amount received too small'
        );
        IERC20(_outputToken).safeTransfer(msg.sender, outputAmount);
        IERC20(_inputToken).safeTransfer(
            _receiver,
            IERC20(_inputToken).balanceOf(address(this))
        );
    }
}
