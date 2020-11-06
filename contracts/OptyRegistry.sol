// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./libraries/Addresses.sol";
import "./utils/Modifiers.sol";

struct StrategyStep {
        address creditPool;
        address creditPoolProxy;
        address borrowToken; 
        address liquidityPool; 
        address poolProxy;
}

struct LiquidityPool {
        uint8 rating;
        bool  isLiquidityPool;
}

/**
 * @dev Contract for Opty Strategy Registry
 */
contract OptyRegistry is Modifiers{
    using Address for address;
    
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

    address   public strategist;
    bytes32[] public strategyHashIndexes;
    bytes32[] public tokensHashIndexes;
    
    mapping(address => bool)                        public tokens;
    mapping(bytes32 => Token)                       public tokensHashToTokens;
    mapping(address => LiquidityPool)               public liquidityPools;
    mapping(address => LiquidityPool)               public creditPools;
    mapping(bytes32 => Strategy)                    public strategies;
    mapping(bytes32 => bytes32[])                   public tokenToStrategies;
    mapping(address => mapping(bytes32 => address)) public liquidityPoolToLPTokens;
    
    /**
     * @dev Sets the value for {governance} and {strategist}, 
     * approves dai, usdt, usdc, tusd, wbtc, weth tokens.
     * 
     * All these tokens can be approved by governance only
     */    
    constructor () public {
        strategist = msg.sender;
        
        // underlying tokens
        address  dai = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
        address usdt = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
        address usdc = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        address tusd = address(0x0000000000085d4780B73119b644AE5ecd22b376);
        address wbtc = address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
        address weth = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
       
        // activate underlying tokens
        approveToken(dai);
        approveToken(usdt);
        approveToken(usdc);
        approveToken(tusd);
        approveToken(wbtc);
        approveToken(weth);

        // declare token groups
        address[] memory tkns = new address[](1);
        tkns[0] = dai; 
        
        // intialized token(dai) hash to dai
        setTokensHashToTokens(tkns);
        
        // activation for aave dai
        address aaveLendingPoolAddressProvider = address(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8);
        address aDAILPToken = address(0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d);
        approveToken(aDAILPToken);
        approveLiquidityPool(aaveLendingPoolAddressProvider);
        approveCreditPool(aaveLendingPoolAddressProvider);
        setLiquidityPoolToLPToken(aaveLendingPoolAddressProvider,tkns,aDAILPToken);
        
        // activation for compound dai
        address cDAILiquidityPool = address(0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643);
        approveToken(cDAILiquidityPool);
        approveLiquidityPool(cDAILiquidityPool);
        setLiquidityPoolToLPToken(cDAILiquidityPool,tkns,cDAILiquidityPool);
        
        //  activation for compound usdc
        tkns = new address[](1);
        tkns[0] = usdc;
        address cUSDCLiquidityPool = address(0x39AA39c021dfbaE8faC545936693aC917d5E7563);
        approveToken(cUSDCLiquidityPool);
        approveLiquidityPool(cUSDCLiquidityPool);
        setLiquidityPoolToLPToken(cUSDCLiquidityPool,tkns,cUSDCLiquidityPool);
        
        // activate for curve compound (dai + usdc)
        tkns = new address[](2);
        tkns[0] = dai;
        tkns[1] = usdc;
        setTokensHashToTokens(tkns);
        address curveCompoundDeposit = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06);
        address curveCompoundLPToken = address(0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2);
        approveLiquidityPool(curveCompoundDeposit);
        approveToken(curveCompoundLPToken);
        setLiquidityPoolToLPToken(curveCompoundDeposit,tkns,curveCompoundLPToken);
    }
    
    /**
     * @dev Transfers strategist to a new account (`_strategist`).
     * Can only be called by the current governance.
     */
    function transferStrategist(address _strategist) public onlyGovernance {
        require(_strategist != address(0),"!address(0)");
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
    function approveToken(address _token) public onlyGovernance returns(bool){
        require(_token != address(0), "!address(0)");
        require(address(_token).isContract(), "!isContract");
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
    function revokeToken(address _token) public onlyGovernance returns(bool) {
        require(tokens[_token],"!tokens");
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
    function approveLiquidityPool(address _pool) public onlyGovernance returns(bool){
        require(_pool != address(0), "!address(0)");
        require(address(_pool).isContract(), "!isContract");
        require(!liquidityPools[_pool].isLiquidityPool,"!liquidityPools");
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
    function revokeLiquidityPool(address _pool) public onlyGovernance {
        require(liquidityPools[_pool].isLiquidityPool,"!liquidityPools");
        emit LogLiquidityPool(msg.sender,_pool,liquidityPools[_pool].isLiquidityPool);
        liquidityPools[_pool].isLiquidityPool = false;
    }
    
    /**
     * @dev Sets `_pool` from the {creditPools} mapping.
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
    function approveCreditPool(address _pool) public onlyGovernance returns (bool) {
        require(_pool != address(0), "!address(0)");
        require(address(_pool).isContract(), "isContract");
        require(!creditPools[_pool].isLiquidityPool, "!creditPools");
        creditPools[_pool].isLiquidityPool = true;
        emit LogLiquidityPool(msg.sender, _pool, creditPools[_pool].isLiquidityPool);
        return true;
    }
    
    /**
     * @dev Revokes `_pool` from the {creditPools} mapping.
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
    function revokeCreditPool(address _pool) public onlyGovernance {
        require(creditPools[_pool].isLiquidityPool,"!creditPools");
        emit LogLiquidityPool(msg.sender,_pool,creditPools[_pool].isLiquidityPool);
        creditPools[_pool].isLiquidityPool = false;
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
    function rateLiquidityPool(address _pool, uint8 _rate) public onlyGovernance returns(bool) {
        require(liquidityPools[_pool].isLiquidityPool,"!liquidityPools");
        liquidityPools[_pool].rating = _rate;
        emit LogRateLiquidityPool(msg.sender,_pool,liquidityPools[_pool].rating);
        return true;
    }
    
    /**
     * @dev Returns the liquidity pool by `_pool`.
     */
   function getLiquidityPool(address _pool) public view returns(LiquidityPool memory _liquidityPool) {	   
         _liquidityPool = liquidityPools[_pool];	    
    }
    
    /**
     * @dev Provide `_rate` to `_pool` from the {creditPools} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogRateCreditPool} event.
     *
     * Requirements:
     *
     * - `_pool` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_pool` should be approved
     */
    function rateCreditPool(address _pool, uint8 _rate) public onlyGovernance returns(bool) {
        require(liquidityPools[_pool].isLiquidityPool,"!liquidityPools");
        creditPools[_pool].rating = _rate;
        emit LogRateCreditPool(msg.sender,_pool,creditPools[_pool].rating);
        return true;
    }
    
    /**
     * @dev Returns the credit pool by `_pool`.
     */
   function getCreditPool(address _pool) public view returns(LiquidityPool memory _creditPool) {	   
         _creditPool = creditPools[_pool];	    
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
     * - `_tokensHash` should be approved.
     * - msg.sender can be governance or strategist.
     * - `creditPool` in {_strategySteps} shoould be approved.
     * - `liquidityPool` in {_strategySteps} should be approved
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function setStrategy(bytes32 _tokensHash,StrategyStep[] memory _strategySteps) public eitherGovernanceOrStrategist returns(bytes32) {
        require(!_isNewTokensHash(_tokensHash),"_isNewTokensHash");
        bytes32[] memory hashes = new bytes32[](_strategySteps.length);
        for(uint8 i = 0 ; i < _strategySteps.length ; i++) {
            hashes[i] = keccak256(
                            abi.encodePacked(
                                _strategySteps[i].creditPool,
                                _strategySteps[i].creditPoolProxy,
                                _strategySteps[i].borrowToken,
                                _strategySteps[i].liquidityPool, 
                                _strategySteps[i].poolProxy
                            )
                        );
        }
        bytes32  hash = keccak256(abi.encodePacked(hashes));
        require(_isNewStrategy(hash),"isNewStrategy");
        for(uint8 i = 0 ; i < _strategySteps.length ; i++) {
            if(
                address(_strategySteps[i].creditPool) == address(0) &&
                address(_strategySteps[i].creditPoolProxy) == address(0) &&
                address(_strategySteps[i].borrowToken) == address(0)
            ){
                    require(
                            liquidityPools[address(_strategySteps[i].liquidityPool)].isLiquidityPool &&
                            _strategySteps[i].poolProxy.isContract()
                        );
            }
            else if(
                address(_strategySteps[i].creditPool) != address(0) && 
                address(_strategySteps[i].creditPoolProxy) != address(0) &&
                address(_strategySteps[i].borrowToken) != address(0) &&
                address(_strategySteps[i].liquidityPool) != address(0) &&
                address(_strategySteps[i].poolProxy) != address(0)
                ){
                require( 
                    creditPools[address(_strategySteps[i].creditPool)].isLiquidityPool &&
                    tokens[_strategySteps[i].borrowToken] &&
                    liquidityPools[address(_strategySteps[i].liquidityPool)].isLiquidityPool &&
                    _strategySteps[i].poolProxy.isContract(),
                    "!strategyStep"
                    );
            }
            else {
                require( 
                    creditPools[address(_strategySteps[i].creditPool)].isLiquidityPool &&
                    tokens[_strategySteps[i].borrowToken] &&
                    _strategySteps[i].poolProxy.isContract(),
                    "!strategyStep"
                    );
            }
            strategies[hash].strategySteps.push(
                                            StrategyStep(
                                                        _strategySteps[i].creditPool,
                                                        _strategySteps[i].creditPoolProxy,
                                                        _strategySteps[i].borrowToken,
                                                        _strategySteps[i].liquidityPool,
                                                        _strategySteps[i].poolProxy
                                                    )
                                            );
        }
        strategyHashIndexes.push(hash);
        strategies[hash].index = strategyHashIndexes.length-1;
        strategies[hash].blockNumber = block.number;
        tokenToStrategies[_tokensHash].push(hash);
        emit LogSetStrategy(msg.sender,_tokensHash,hash);
        return hash;
    }
    
    /**
     * @dev Returns the Strategy by `_hash`.
     */
   function getStrategy(bytes32 _hash) public view returns(uint8 _score, bool _isStrategy, uint256 _index, uint256 _blockNumber, StrategyStep[] memory _strategySteps) {	   
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
     * - `_hash` strategy should exist in {strategyHashIndexes}
     */
   function approveStrategy(bytes32 _hash) public onlyGovernance returns(bool){	    
        // require(_hash.length > 0 , "empty");	    
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
     * - `_hash` strategy should exist in {strategyHashIndexes}
     */
    function revokeStrategy(bytes32 _hash) public onlyGovernance returns(bool){	    
        // require(_hash.length > 0 , "empty");	    
        // require(!_isNewStrategy(_hash),"!isNewStrategy");	    
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
     * - `_hash` strategy should exist in {strategyHashIndexes}
     */
    function scoreStrategy(bytes32 _hash, uint8 _score) public onlyGovernance returns(bool){
        //  require(_hash.length > 0 , "empty");
         require(!_isNewStrategy(_hash),"!isNewStrategy");
         require(strategies[_hash].isStrategy,"strategies.isStrategy");
         strategies[_hash].score = _score;
         emit LogScoreStrategy(msg.sender,_hash,strategies[_hash].score);
         return true;
     }
    
    /**
     * @dev Returns the list of strategy hashes by `_token`.
     */
    function getTokenToStrategies(bytes32 _tokensHash) public view returns(bytes32[] memory) {
         return tokenToStrategies[_tokensHash];
     }
     
     /**
     * @dev Sets `_poolToken` to the `_pool` from the {liquidityPoolToLPTokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogSetLiquidityPoolToLPTokens} event.
     *
     * Requirements:
     *
     * - `_pool`should be approved.
     * - msg.sender should be governance.
     * - `_tokens` should be approved
     * - `_poolToken` should be approved
     */
     function setLiquidityPoolToLPToken(address _pool, address[] memory _tokens, address _poolToken) public onlyGovernance returns(bool success){
        require(liquidityPools[_pool].isLiquidityPool,"!liquidityPools.isLiquidityPool");
        require(tokens[_poolToken],"!tokens");
        for(uint8 i = 0 ; i < _tokens.length ; i++) {
            require(tokens[_tokens[i]],"!_tokens");
        }
        bytes32 tokensHash = keccak256(abi.encodePacked(_tokens));
        liquidityPoolToLPTokens[_pool][tokensHash] = _poolToken;
        LogSetLiquidityPoolToLPTokens(msg.sender,_pool,tokensHash,_poolToken);
        success = true;
    }
    
    /**
     * @dev Returns the lpToken given the `_pool` and `_tokens`.
     */
    function getLiquidityPoolToLPToken(address _pool, address[] memory _tokens) public view returns(address) {
        bytes32 tokensHash = keccak256(abi.encodePacked(_tokens));
        return liquidityPoolToLPTokens[_pool][tokensHash];
    }
    
    /**
     * @dev Sets `_poolToken` to the `_pool` from the {liquidityPoolToLPTokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogSetLiquidityPoolToLPTokens} event.
     *
     * Requirements:
     *
     * - `_pool`should be approved.
     * - msg.sender should be governance.
     * - `_tokens` should be approved
     * - `_poolToken` should be approved
     */
    function setTokensHashToTokens(address[] memory _tokens) public onlyGovernance {
        for(uint8 i = 0 ;i < _tokens.length ; i++) {
            require(tokens[_tokens[i]],"!tokens");
        }
        bytes32 tokensHash = keccak256(abi.encodePacked(_tokens));
        require(_isNewTokensHash(tokensHash),"!_isNewTokensHash");
        tokensHashIndexes.push(tokensHash);
        tokensHashToTokens[tokensHash].index = tokensHashIndexes.length - 1;
        for(uint8 i = 0 ; i < _tokens.length ;  i++) {
                 tokensHashToTokens[tokensHash].tokens.push(_tokens[i]);   
        }
    }
    
    /**
     * @dev Returns list of token given the `_tokensHash`.
     */
    function getTokensHashToTokens(bytes32 _tokensHash) public view returns(address[] memory) {
        return tokensHashToTokens[_tokensHash].tokens;
    }
    
    /**
     * @dev Check duplicate `_hash` Startegy from the {strategyHashIndexes} mapping.
     *
     * Returns a boolean value indicating whether duplicate `_hash` exists or not.
     *
     * Requirements:
     *
     * - {strategyHashIndexes} length should be more than zero.
     */
    function _isNewStrategy(bytes32 _hash) private view returns(bool) {
         if (strategyHashIndexes.length == 0) {
             return true;
         }
         return (strategyHashIndexes[strategies[_hash].index] != _hash);
     }
     
     /**
     * @dev Check duplicate `_hash` tokensHash from the {tokensHashIndexes} mapping.
     *
     * Returns a boolean value indicating whether duplicate `_hash` exists or not.
     *
     * Requirements:
     *
     * - {tokensHashIndexes} length should be more than zero.
     */
    function _isNewTokensHash(bytes32 _hash) private view returns(bool) {
         if (tokensHashIndexes.length == 0) {
             return true;
         }
         return (tokensHashIndexes[tokensHashToTokens[_hash].index] != _hash);
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
     * @dev Emitted when `pool` is rated.
     *
     * Note that `pool` cannot be zero address or EOA.
     */
    event LogRateCreditPool(address indexed caller,address indexed pool, uint8 indexed rate);
    
    /**
     * @dev Emitted when `hash` strategy is set.
     *
     * Note that `token` cannot be zero address or EOA.
     */
    event LogSetStrategy(address indexed caller,bytes32 indexed tokensHash, bytes32 indexed hash);
    
    /**
     * @dev Emitted when `hash` strategy is approved or revoked.
     *
     * Note that `hash` startegy should exist in {strategyHashIndexes}.
     */
    event LogStrategy(address indexed caller,bytes32 indexed hash,bool indexed enabled);
    
    /**
     * @dev Emitted when `hash` strategy is scored.
     *
     * Note that `hash` startegy should exist in {strategyHashIndexes}.
     */
    event LogScoreStrategy(address indexed caller, bytes32 indexed hash, uint8 indexed score);
    
    /**
     * @dev Emitted when liquidity pool `tokens` are assigned to pool.
     *
     * Note that `pool` and `tokens` should be approved in {liquidityPools} and {tokens} respectively.
     */
    event LogSetLiquidityPoolToLPTokens(address indexed caller, address indexed pool, bytes32 indexed tokens, address poolToken);
}