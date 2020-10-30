// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IOptyRegistry{
    struct LiquidityPool {
        uint8 rating;
        bool  isLiquidityPool;
    }
    
    struct StrategyStep {
        address creditPool;
        address creditPoolToken;
        address creditPoolProxy;
        address borrowToken; 
        address liquidityPool; 
        address lendingPoolToken;
        address poolProxy;
    }

    struct Strategy { 
        uint8          score;
        bool           isStrategy;
        uint256        index;
        uint256        blockNumber;
        StrategyStep[] strategySteps;
    }


    function getTokenToStrategies(bytes32 _tokensHash) external view returns(bytes32[] memory);
    function getStrategy(bytes32 _hash) external view returns(uint8 _score, bool _isStrategy, uint256 _index, uint256 _blockNumber, StrategyStep[] memory _strategySteps);
    function getTokenStrategies(bytes32 _tokensHash) external view returns(bytes32[] memory);
    // function tokenToStrategies(address _underLyingToken, uint256 index) external view returns(bytes32);
    // function getStrategy(bytes32 _hash) external view returns(uint8 _score, bool _isStrategy, uint256 _index, uint256 _blockNumber, StrategyStep[] memory _strategySteps);
    // function getTokenStrategies(address _token) external view returns(bytes32[] memory);
    function liquidityPools(address _pool) external view returns(LiquidityPool memory);
    function creditPools(address _pool) external view returns(LiquidityPool memory);
}