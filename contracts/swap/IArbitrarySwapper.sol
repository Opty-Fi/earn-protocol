// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

interface IArbitrarySwapper {
    /**
     * @notice performs an arbitrary swap-call on a whitelisted target
     * @param _inputToken address of token to be swapped
     * @param _inputTokenAmount amount of token to be swapped
     * @param _outputToken address of token to be returned from the swap
     * @param _outputTokenAmountMin the minimum amount of outputToken expected from the swap
     * @param _target address of exchange
     * @param _receiver address to receive outputAmount
     * @param _data calldata for execution of swap
     * @return outputAmount of the outputToken from the swap
     */
    function swap(
        address _inputToken,
        uint256 _inputTokenAmount,
        address _outputToken,
        uint256 _outputTokenAmountMin,
        address _target,
        address _receiver,
        bytes calldata _data
    ) external returns (uint256 outputAmount);
}
