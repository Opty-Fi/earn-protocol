// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;

import "./utils/Modifiers.sol";
import "./libraries/Addresses.sol";

contract OptyRegistry is Modifiers {
    using Address for address;

    struct StrategyStep {
        address token; 
        address creditPool; 
        address borrowToken; 
        address liquidityPool; 
        address strategyContract;
    }
    
    struct Strategy{
        StrategyStep[] strategySteps; 
        uint8 score; 
        uint256 blockNumber;
        bool enabled;
    }
    
    mapping(address => bool)                                         public tokens;
    mapping(address => bool)                                         public liquidityPools;
    mapping(address => uint)                                         public liquidityPoolRatings;
    mapping(string => bool)                                          public strategyProfiles;
    mapping(address => mapping(string => uint))                      public poolToStrategyIdCounter;
    mapping(address => mapping(string => mapping(uint => Strategy))) public tokensToStrategy;

    /**
     * @dev Sets the value for {owner}, {governance} and {strategist}, initializes
     * the dai, usdt, usdc, tusd, wbtc, weth defualt address.
     * 
     * All these token addresses are mutuable and can be changed afterwards only by owner,
     * governance and strategist
     */
    constructor () public Modifiers() {
        address dai = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
        address usdt = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
        address usdc = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        address tusd = address(0x0000000000085d4780B73119b644AE5ecd22b376);
        address wbtc = address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
        address weth = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
        enableTokens(dai);
        enableTokens(usdt);
        enableTokens(usdc);
        enableTokens(tusd);
        enableTokens(wbtc);
        enableTokens(weth);
    }
    
    /**
     * @dev Returns the status of the token's address is enabled or not after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be either owner or governance or strategist
     * - `_token` cannot be a zero address`
     * - `_token` should be a contract's address and not EOA.
     */
    function enableTokens(address _token) public onlyValidAddress onlyOwner onlyGovernance onlyStrategist returns(bool) {
        require(_token != address(0), "token address is a zero address");
        require(address(_token).isContract(), "Call to non-contract address");
        require(!tokens[_token],"Pool is already enabled");
        tokens[_token] = true;
        return tokens[_token];
    }
    
    /**
     * @dev Returns the status of the token's address is disabled or not after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be either owner or governance or strategist
     * - `_token` cannot be a zero address`
     * - `_token` should be a contract's address and not EOA.
     */
    function disableTokens(address _token) public onlyValidAddress onlyOwner onlyGovernance onlyStrategist returns(bool) {
        require(_token != address(0), "Token address is a zero address");
        require(address(_token).isContract(), "Call to non-contract address");
        require(tokens[_token], "Token address doesn't exist");
        tokens[_token] = false;
        return tokens[_token];
    }
    /**
     * @dev Returns the status of the liquidity pool whether it is enabled or not after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be governance
     * - `_poolToken` cannot be a zero address`
     * - `_poolToken` should be a contract's address and not EOA.
     */
    function enableLiquidityPool(address _poolToken) public onlyValidAddress onlyGovernance returns(bool) {
        require(_poolToken != address(0), "poolToken address is a zero address");
        require(address(_poolToken).isContract(), "Call to non-contract address");
        require(!liquidityPools[_poolToken],"Pool is already enabled");
        liquidityPools[_poolToken] = true;
        return liquidityPools[_poolToken];
    }
    
    /**
     * @dev Returns the status of the liquidity pool whether it is enabled or not after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be either governance
     * - `_poolToken` cannot be a zero address`
     * - `_poolToken` should be a contract's address and not EOA.
     */
    function disableLiquidityPool(address _poolToken) public onlyValidAddress onlyOwner onlyGovernance onlyStrategist returns(bool) {
        require(_poolToken != address(0), "poolToken address is a zero address");
        require(address(_poolToken).isContract(), "Call to non-contract address");
        require(liquidityPools[_poolToken],"Pool is already disabled");
        liquidityPools[_poolToken] = false;
        return liquidityPools[_poolToken];
    }
    
    /**
     * @dev Returns the rating of the liquidity pool after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be governance
     * - `_poolToken` cannot be a zero address`
     * - `_poolToken` should be a contract's address and not EOA.
     * - `_poolToken` should be enabled
     */
    function rateLiquidityPool(address _poolToken, uint _rate) public onlyValidAddress onlyGovernance returns(uint) {
        require(_poolToken != address(0), "poolToken address is a zero address");
        require(address(_poolToken).isContract(), "Call to non-contract address");
        require(liquidityPools[_poolToken],"Pool is not enabled");
        liquidityPoolRatings[_poolToken] = _rate;
        return liquidityPoolRatings[_poolToken];
    }

     /**
     * @dev Returns the status of strategy profile whether it is enabled or disabled after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be governance
     * - `_strategyProfileId` should not be enabled`
     */
    function enableStrategyProfile(string memory _strategyProfile) public onlyGovernance returns(bool){
        require(!strategyProfiles[_strategyProfile],"strategy is already enabled");
        strategyProfiles[_strategyProfile] = true;
        return strategyProfiles[_strategyProfile];
    }

     /**
     * @dev Returns the status of strategy profile whether it is enabled or disabled after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be governance
     * - `_strategyProfileId` should not be disabled`
     */
    function disableStrategyProfile(string memory _strategyProfile) public onlyGovernance returns(bool){
        require(strategyProfiles[_strategyProfile],"strategy is already disabled");
        strategyProfiles[_strategyProfile] = false;
        return strategyProfiles[_strategyProfile];
    }

    /**
     * @dev Returns the strategy Id after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be owner
     * - `_token` should be enabled`
     * - `_strategyProfile` should be enabled
     */
    function initialiseStrategy(address _token, string memory _strategyProfile, StrategyStep[] memory _strategySteps) public onlyOwner returns(uint){
        require(tokens[_token],"token is not enabled");
        require(strategyProfiles[_strategyProfile],"strategy profile is not enabled");
        uint strategyId = poolToStrategyIdCounter[_token][_strategyProfile];
        for(uint i = 0 ; i < _strategySteps.length; i++) {
        tokensToStrategy[_token][_strategyProfile][strategyId].strategySteps.push(
            StrategyStep(_strategySteps[i].token,_strategySteps[i].creditPool,_strategySteps[i].borrowToken,_strategySteps[i].liquidityPool,_strategySteps[i].strategyContract));
        }
        tokensToStrategy[_token][_strategyProfile][strategyId].blockNumber = block.number; 
        poolToStrategyIdCounter[_token][_strategyProfile]++;
        return strategyId;
    }
    
    function getStrategy(address _token, string memory _strategyProfile,uint _strategyId) public view returns(StrategyStep[] memory) {
        return tokensToStrategy[_token][_strategyProfile][_strategyId].strategySteps;
    }

    /**
     * @dev Returns the status of strategy it is enabled or disabled after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be governance
     * - `_token` should be enabled`
     * - `_strategyProfile` should be enabled`
     * - `_StrategyId` should not be enabled
     */
    function enableStrategy(address _token, string memory _strategyProfile, uint _strategyId) public onlyGovernance returns(bool){
        require(tokens[_token],"token is not enabled");
        require(strategyProfiles[_strategyProfile],"strategy profile is not enabled");
        require(!tokensToStrategy[_token][_strategyProfile][_strategyId].enabled,"strategy is already enabled");
        tokensToStrategy[_token][_strategyProfile][_strategyId].enabled = true;
        tokensToStrategy[_token][_strategyProfile][_strategyId].blockNumber = block.number; 
        return tokensToStrategy[_token][_strategyProfile][_strategyId].enabled;
    }

    /**
     * @dev Returns the status of strategy whether it is enabled or disabled after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be governance
     * - `_token` should be enabled`
     * - `_strategyProfile` should be enabled`
     * - `_strategyId` should not be disabled
     */
    function disableStrategy(address _token, string memory _strategyProfile, uint _strategyId) public onlyGovernance returns(bool){
        require(tokens[_token],"token is not enabled");
        require(strategyProfiles[_strategyProfile],"strategy profile is not enabled");
        require(tokensToStrategy[_token][_strategyProfile][_strategyId].enabled,"strategy is already disabled");
        tokensToStrategy[_token][_strategyProfile][_strategyId].enabled = false;
        tokensToStrategy[_token][_strategyProfile][_strategyId].blockNumber = block.number; 
        return tokensToStrategy[_token][_strategyProfile][_strategyId].enabled;
    }

    /**
     * @dev Returns the score of strategy after the function call.
     * 
     * Requirements:
     * 
     * - the caller should be governance
     * - `_token` should be enabled`
     * - `_strategyProfile` should be enabled`
     * - `_strategyId` should be enabled
     */
    function scoreStrategy(address _token, string memory _strategyProfile, uint _strategyId,uint _score ) public onlyGovernance returns(uint){
        require(tokens[_token],"token is not enabled");
        require(strategyProfiles[_strategyProfile],"strategy profile is not enabled");
        require(tokensToStrategy[_token][_strategyProfile][_strategyId].enabled,"strategy is disabled");
        tokensToStrategy[_token][_strategyProfile][_strategyId].score = _score;
        tokensToStrategy[_token][_strategyProfile][_strategyId].blockNumber = block.number; 
        return tokensToStrategy[_token][_strategyProfile][_strategyId].score;
    }
}
