// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IOptyStrategy {
    function deploy(uint _amount, bytes32 _hash) external returns(bool _success);
    function recall(uint _amount, bytes32 _hash) external returns(bool _success);
    function balance(bytes32 _hash, address _account) external view returns(uint _balance);
    function balanceInToken(bytes32 _hash, address _account) external view returns(uint _balance);
    function getLiquidityPoolToken(bytes32 _hash) external view returns(address _lendingPool);
}