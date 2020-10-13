
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./libraries/Addresses.sol";

/**
 * @dev Contract for Opty Strategy Registry
 */
contract OptyRegistry {
    using Address for address;
    
    struct LiquidityPool{
        uint8 rating;
        bool  isLiquidityPool;
    }
    
    struct StrategyStep {
        address token; 
        address creditPool; 
        address borrowToken; 
        address liquidityPool; 
        address strategyContract;
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
    
    address   public governance;
    address   public strategist;
    bytes32[] public strategyIndexes;
    
    mapping(address => bool)          public tokens;
    mapping(bytes32 => Strategy)      public strategies;
    mapping(address => bytes32[])     public tokenToStrategies;
    mapping(address => LiquidityPool) public liquidityPools;

    /**
     * @dev Sets the value for {governance} and {strategist}, 
     * approves dai, usdt, usdc, tusd, wbtc, weth tokens.
     * 
     * All these tokens can be approved by governance only
     */    
    constructor () public {
        governance = msg.sender;
        strategist = msg.sender;
        address  dai = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
        address usdt = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
        address usdc = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        address tusd = address(0x0000000000085d4780B73119b644AE5ecd22b376);
        address wbtc = address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
        address weth = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
        approveToken(dai);
        approveToken(usdt);
        approveToken(usdc);
        approveToken(tusd);
        approveToken(wbtc);
        approveToken(weth);
    }
    
    /**
     * @dev Transfers governance to a new account (`_governance`).
     * Can only be called by the current governance.
     */    
    function transferGovernance(address _governance) public onlyValidAddress onlyGovernance {
        governance = _governance;
    }
    
    /**
     * @dev Transfers strategist to a new account (`_strategist`).
     * Can only be called by the current governance.
     */
    function transferStrategist(address _strategist) public onlyValidAddress onlyGovernance {
        strategist = _strategist;
    }
    
    /**
     * @dev Sets `_token` from the {tokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogToken} event.
     *
     * Requirements:
     *
     * - `_token` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_token` should not be approved
     */
    function approveToken(address _token) public onlyValidAddress onlyGovernance returns(bool){
        require(_token != address(0), "zero address");
        require(address(_token).isContract(), "isContract");
        require(!tokens[_token],"!tokens");
        tokens[_token] = true;
        emit LogToken(msg.sender,_token,tokens[_token]);
        return true;
    }
    
    /**
     * @dev Revokes `_token` from the {tokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogToken} event.
     *
     * Requirements:
     *
     * - `_token` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_token` should be approved
     */
    function revokeToken(address _token) public onlyValidAddress  onlyGovernance returns(bool) {
        require(_token != address(0), "zero address");
        require(address(_token).isContract(), "isContract");
        require(tokens[_token],"tokens");
        tokens[_token] = false;
        emit LogToken(msg.sender,_token,tokens[_token]);
        return true;
    }
    
    /**
     * @dev Sets `_pool` from the {liquidityPools} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogLiquidityPool} event.
     *
     * Requirements:
     *
     * - `_pool` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_pool` should not be approved
     */
    function approveLiquidityPool(address _pool) public onlyValidAddress onlyGovernance returns(bool){
        require(_pool != address(0), "zero address");
        require(address(_pool).isContract(), "isContract");
        require(!liquidityPools[_pool].isLiquidityPool,"!liquidityPools.isLiquidityPool");
        liquidityPools[_pool].isLiquidityPool = true;
        emit LogLiquidityPool(msg.sender,_pool,liquidityPools[_pool].isLiquidityPool);
        return true;
    }
    
    /**
     * @dev Revokes `_pool` from the {liquidityPools} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogLiquidityPool} event.
     *
     * Requirements:
     *
     * - `_pool` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_pool` should not be approved
     */
    function revokeLiquidityPool(address _pool) public onlyValidAddress onlyGovernance {
        require(_pool != address(0), "pool address is a zero address");
        require(address(_pool).isContract(), "Call to non-contract address");
        require(liquidityPools[_pool].isLiquidityPool,"liquidityPools.isLiquidityPool");
        emit LogLiquidityPool(msg.sender,_pool,liquidityPools[_pool].isLiquidityPool);
        liquidityPools[_pool].isLiquidityPool = false;
    }
    
    /**
     * @dev Provide `_rate` to `_pool` from the {liquidityPools} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogRateLiquidityPool} event.
     *
     * Requirements:
     *
     * - `_pool` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_pool` should be approved
     */
    function rateLiquidityPool(address _pool, uint8 _rate) public onlyValidAddress onlyGovernance returns(bool) {
        require(_pool != address(0), "zero address");
        require(address(_pool).isContract(), "isContract");
        require(liquidityPools[_pool].isLiquidityPool,"liquidityPools.isLiquidityPool");
        liquidityPools[_pool].rating = _rate;
        emit LogRateLiquidityPool(msg.sender,_pool,liquidityPools[_pool].rating);
        return true;
    }

     /**
     * @dev Sets `_strategySteps` for `_pool` from the {liquidityPools} mapping.
     *
     * Returns a hash value of strategy indicating successful operation.
     *
     * Emits a {LogSetStrategy} event.
     *
     * Requirements:
     *
     * - `_token` cannot be the zero address or an EOA.
     * - `_token` should be approved.
     * - msg.sender can be governance or strategist.
     * - `creditPool` in {_strategySteps} shoould be approved.
     * - `token` in {_strategySteps} should be approved.
     * - `liquidityPool` in {_strategySteps} should be approved
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function setStrategy(address _token,StrategyStep[] memory _strategySteps) public onlyValidAddress eitherGovernanceOrStrategist returns(bytes32) {
        require(tokens[_token],"tokens");
        bytes32[] memory hashes = new bytes32[](_strategySteps.length);
        for(uint8 i = 0 ; i < _strategySteps.length ; i++) {
            hashes[i] = keccak256(abi.encodePacked(_strategySteps[i].token,_strategySteps[i].creditPool,_strategySteps[i].borrowToken,_strategySteps[i].liquidityPool,_strategySteps[i].strategyContract, _strategySteps[i].lendingPoolToken, _strategySteps[i].poolProxy));
        }
        bytes32  hash = keccak256(abi.encodePacked(hashes));
        require(_isNewStrategy(hash),"isNewStrategy");
        for(uint8 i = 0 ; i < _strategySteps.length ; i++) {
            if(address(_strategySteps[i].creditPool) == address(0) && address(_strategySteps[i].borrowToken) == address(0)){
                require(address(_strategySteps[i].token).isContract() && address(_strategySteps[i].liquidityPool).isContract() && 
            address(_strategySteps[i].strategyContract).isContract() && 
            liquidityPools[address(_strategySteps[i].liquidityPool)].isLiquidityPool &&
            tokens[address(_strategySteps[i].token)],"!strategyStep");
                    strategies[hash].strategySteps.push(
                        StrategyStep(_strategySteps[i].token,_strategySteps[i].creditPool,_strategySteps[i].borrowToken,
                        _strategySteps[i].liquidityPool,_strategySteps[i].strategyContract, _strategySteps[i].lendingPoolToken,
                        _strategySteps[i].poolProxy)
                        );
            }
            else if(address(_strategySteps[i].creditPool).isContract() && address(_strategySteps[i].borrowToken).isContract()){
                revert("!CP-not-implemented");
            }
            else {
                revert("!strategyStep-CP");
            }
        }
        strategyIndexes.push(hash);
        strategies[hash].index = strategyIndexes.length-1;
        strategies[hash].blockNumber = block.number;
        tokenToStrategies[_token].push(hash);
        emit LogSetStrategy(msg.sender,_token,hash);
        return hash;
    }
    
    /**
     * @dev Returns the Strategy by `_hash`.
     */
    function getStrategy(bytes32 _hash) public view returns(uint8 _score, bool _isStrategy, uint256 _index, uint256 _blockNumber, StrategyStep[] memory _strategySteps) {
         require(_hash.length > 0 , "empty");
         _score = strategies[_hash].score;
         _isStrategy = strategies[_hash].isStrategy;
         _index = strategies[_hash].index;
         _blockNumber = strategies[_hash].blockNumber;
         _strategySteps = strategies[_hash].strategySteps;
    }
    
    /**
     * @dev Sets `_hash` Startegy from the {strategies} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogStrategy} event.
     *
     * Requirements:
     *
     * - `_hash`'s lengt hshould be more than zero.
     * - msg.sender should be governance.
     * - `_hash` strategy should not be approved
     * - `_hash` strategy should exist in {strategyIndexes}
     */
    function approveStrategy(bytes32 _hash) public onlyValidAddress onlyGovernance returns(bool){
        require(_hash.length > 0 , "empty");
        require(!_isNewStrategy(_hash),"!isNewStrategy");
        require(!strategies[_hash].isStrategy,"!strategies.isStrategy");
        strategies[_hash].isStrategy = true;
        emit LogStrategy(msg.sender,_hash,strategies[_hash].isStrategy);
        return true;
    }
    
    /**
     * @dev Revokes `_hash` Startegy from the {strategies} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogStrategy} event.
     *
     * Requirements:
     *
     * - `_hash`'s lengt hshould be more than zero.
     * - msg.sender should be governance.
     * - `_hash` strategy should not be revoked
     * - `_hash` strategy should exist in {strategyIndexes}
     */
    function revokeStrategy(bytes32 _hash) public onlyValidAddress onlyGovernance returns(bool){
        require(_hash.length > 0 , "empty");
        require(!_isNewStrategy(_hash),"!isNewStrategy");
        require(strategies[_hash].isStrategy,"strategies.isStrategy");
        strategies[_hash].isStrategy = false;
        emit LogStrategy(msg.sender,_hash,strategies[_hash].isStrategy);
        return true;
    }
    
    /**
     * @dev Scores `_hash` Startegy from the {strategies} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogScoreStrategy} event.
     *
     * Requirements:
     *
     * - `_hash`'s length hshould be more than zero.
     * - msg.sender should be governance.
     * - `_hash` strategy should be approved
     * - `_hash` strategy should exist in {strategyIndexes}
     */
    function scoreStrategy(bytes32 _hash, uint8 _score) public onlyValidAddress onlyGovernance returns(bool){
        require(_hash.length > 0 , "empty");
        require(!_isNewStrategy(_hash),"!isNewStrategy");
        require(strategies[_hash].isStrategy,"strategies.isStrategy");
        strategies[_hash].score = _score;
        emit LogScoreStrategy(msg.sender,_hash,strategies[_hash].score);
        return true;
    }
    
    /**
     * @dev Check duplicate `_hash` Startegy from the {strategyIndexes} mapping.
     *
     * Returns a boolean value indicating whether duplicate `_hash` exists or not.
     *
     * Requirements:
     *
     * - {strategyIndexes} length should be more than zero.
     */
    function _isNewStrategy(bytes32 _hash) private view returns(bool) {
        if (strategyIndexes.length == 0) {
            return true;
        }
        return (strategyIndexes[strategies[_hash].index] != _hash);
    }
    
    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }
    
    /**
     * @dev Modifier to check if the address is zero address or not
     */
    modifier onlyValidAddress(){
        require(msg.sender != address(0), "zero address");
        _;
    }
    
    /**
     * @dev Modifier to check caller is governance or strategist
     */
    modifier eitherGovernanceOrStrategist() {
        require(msg.sender == strategist || msg.sender == governance, "!governance!strategist");
        _;
    }
    
    /**
     * @dev Emitted when `token` is approved or revoked.
     *
     * Note that `token` cannot be zero address or EOA.
     */
    event LogToken(address indexed caller,address indexed token, bool indexed enabled);
    
    /**
     * @dev Emitted when `pool` is approved or revoked.
     *
     * Note that `pool` cannot be zero address or EOA.
     */
    event LogLiquidityPool(address indexed caller,address indexed pool, bool indexed enabled);
    
    /**
     * @dev Emitted when `pool` is rated.
     *
     * Note that `pool` cannot be zero address or EOA.
     */
    event LogRateLiquidityPool(address indexed caller,address indexed pool, uint8 indexed rate);
    
    /**
     * @dev Emitted when `hash` startegy is set.
     *
     * Note that `token` cannot be zero address or EOA.
     */
    event LogSetStrategy(address indexed caller,address indexed token, bytes32 indexed hash);
    
    /**
     * @dev Emitted when `hash` strategy is approved or revoked.
     *
     * Note that `hash` startegy should exist in {strategyIndexes}.
     */
    event LogStrategy(address indexed caller,bytes32 indexed hash,bool indexed enabled);
    
    /**
     * @dev Emitted when `hash` strategy is scored.
     *
     * Note that `hash` startegy should exist in {strategyIndexes}.
     */
    event LogScoreStrategy(address indexed caller, bytes32 indexed hash, uint8 indexed score);
}