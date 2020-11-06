// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IOptyStrategy {
    function deploy(
                address[] memory _underlyingTokens,
                uint[] memory _amounts, 
                bytes32 _hash
                ) external returns(bool _success);
    function recall(
                address[] memory _underlyingTokens,
                uint _amount, 
                bytes32 _hash
                ) external returns(bool _success);
    function balanceInToken(
                        bytes32 _hash,
                        address[] memory _underlyingTokens, 
                        address _underlyingToken, 
                        address _account
                        ) external view returns(uint _balance);
    function getLiquidityPoolToken(
        address[] memory _underlyingTokens, 
        bytes32 _hash
        ) external view returns(address _lendingPool);
}