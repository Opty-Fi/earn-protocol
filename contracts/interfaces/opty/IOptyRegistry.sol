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
        address creditPoolProxy;
        address borrowToken; 
        address liquidityPool;
        address poolProxy;
    }
    
    struct Strategy { 
        uint8          score;
        bool           isStrategy;
        uint256        index;
        uint256        blockNumber;
        StrategyStep[] strategySteps;
    }
    
    struct Token {
        uint256   index;
        address[] tokens;
    }

    function getTokenToStrategies(bytes32 _tokensHash) external view returns(bytes32[] memory);
    function getStrategy(bytes32 _hash) external view returns(uint8 _score, bool _isStrategy, uint256 _index, uint256 _blockNumber, StrategyStep[] memory _strategySteps);
    function liquidityPools(address _pool) external view returns(LiquidityPool memory);
    function getLiquidityPoolToken(bytes32 _hash) external view returns(address _lendingPool);
    function getTokensHashToTokens(bytes32 _tokensHash) external view returns(address[] memory);
    function getLiquidityPoolToLPToken(address _pool, address[] memory _tokens) external view returns(address);
}