// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./libraries/Addresses.sol";
import "./utils/ModifiersController.sol";

struct StrategyStep {
    address pool;
    address outputToken;
    bool isBorrow;
}

struct LiquidityPool {
    uint8 rating;
    bool  isLiquidityPool;
}

/**
 * @dev Contract for Opty Strategy Registry
 */
contract Registry is ModifiersController {
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

    bytes32[] public strategyHashIndexes;
    bytes32[] public tokensHashIndexes;
    
    mapping(address => bool)                        public tokens;
    mapping(bytes32 => Token)                       public tokensHashToTokens;
    mapping(address => LiquidityPool)               public liquidityPools;
    mapping(address => LiquidityPool)               public creditPools;
    mapping(bytes32 => Strategy)                    public strategies;
    mapping(bytes32 => bytes32[])                   public tokenToStrategies;
    mapping(address => mapping(bytes32 => address)) public liquidityPoolToLPTokens;
    mapping(address => mapping(address => bytes32)) public liquidityPoolToTokenHashes;
    mapping(address => address)                     public liquidityPoolToCodeProvider;
    
    /**
     * @dev Sets the value for {governance} and {strategist}, 
     * approves dai, usdt, usdc, tusd, wbtc, weth tokens.
     * 
     * All these tokens can be approved by governance only
     */    
    constructor () public ModifiersController(msg.sender, msg.sender, msg.sender) {
        
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
        
        // intialized token(dai) hash to dai
        tkns[0] = dai; 
        setTokensHashToTokens(tkns);
        
        // activation for aave dai
        address aaveLendingPoolAddressProvider = address(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8);
        address aDAILPToken = address(0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d);
        approveToken(aDAILPToken);
        approveLiquidityPool(aaveLendingPoolAddressProvider);
        setLiquidityPoolToLPToken(aaveLendingPoolAddressProvider,tkns,aDAILPToken);
        
        // activation for compound dai
        address cDAILiquidityPool = address(0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643);
        approveToken(cDAILiquidityPool);
        approveLiquidityPool(cDAILiquidityPool);
        setLiquidityPoolToLPToken(cDAILiquidityPool,tkns,cDAILiquidityPool);

        // activation for yearn dai vault
        address yearnDAIVault = address(0xACd43E627e64355f1861cEC6d3a6688B31a6F952);
        approveLiquidityPool(yearnDAIVault);
        approveToken(yearnDAIVault);
        setLiquidityPoolToLPToken(yearnDAIVault,tkns,yearnDAIVault);
        
        //  activation for harvest dai vault
        address harvestDAIvault = address(0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C);
        approveToken(harvestDAIvault);
        approveLiquidityPool(harvestDAIvault);
        setLiquidityPoolToLPToken(harvestDAIvault,tkns,harvestDAIvault);
        
        // activation for fulcrum dai
        address fulcrumDAILendingPool = address(0x6b093998D36f2C7F0cc359441FBB24CC629D5FF0);
        approveLiquidityPool(fulcrumDAILendingPool);
        approveToken(fulcrumDAILendingPool);
        setLiquidityPoolToLPToken(fulcrumDAILendingPool,tkns,fulcrumDAILendingPool);
        
        // activation for dforce dai
        address dforceDAILiquidityPool = address(0x02285AcaafEB533e03A7306C55EC031297df9224);
        approveLiquidityPool(dforceDAILiquidityPool);
        approveToken(dforceDAILiquidityPool);
        setLiquidityPoolToLPToken(dforceDAILiquidityPool,tkns,dforceDAILiquidityPool);
        
        //  activation for compound usdc
        tkns = new address[](1);
        tkns[0] = usdc;
        setTokensHashToTokens(tkns);
        
        //  activation for compound usdc
        address cUSDCLiquidityPool = address(0x39AA39c021dfbaE8faC545936693aC917d5E7563);
        approveToken(cUSDCLiquidityPool);
        approveLiquidityPool(cUSDCLiquidityPool);
        setLiquidityPoolToLPToken(cUSDCLiquidityPool,tkns,cUSDCLiquidityPool);
        
        // activation for cream usdc
        address crUSDCLendingPool = address(0x44fbeBd2F576670a6C33f6Fc0B00aA8c5753b322);
        approveLiquidityPool(crUSDCLendingPool);
        approveToken(crUSDCLendingPool);
        setLiquidityPoolToLPToken(crUSDCLendingPool,tkns,crUSDCLendingPool);

        
        // activation for curve compound (dai + usdc)
        tkns = new address[](2);
        tkns[0] = dai;
        tkns[1] = usdc;
        setTokensHashToTokens(tkns);
        
        // activate for curve compound (dai + usdc)
        address curveCompoundDeposit = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06);
        address curveCompoundLPToken = address(0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2);
        approveLiquidityPool(curveCompoundDeposit);
        approveToken(curveCompoundLPToken);
        setLiquidityPoolToLPToken(curveCompoundDeposit,tkns,curveCompoundLPToken);
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
     * @dev Returns the liquidity pool by `_pool`.
     */
    function getLiquidityPool(address _pool) public view returns(LiquidityPool memory _liquidityPool) {	   
        _liquidityPool = liquidityPools[_pool];	    
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
     * @dev Returns the credit pool by `_pool`.
     */
    function getCreditPool(address _pool) public view returns(LiquidityPool memory _creditPool) {	   
        _creditPool = creditPools[_pool];	    
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
     * @dev Sets liquidity `_pool` to the protocol code provider `_codeProvider` from the {liquidityPoolToCodeProvider} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogLiquidityPoolToDepositToken} event.
     *
     * Requirements:
     *
     * - `_pool`should be approved.
     * - msg.sender should be governance.
     * - `_codeProvider` should be contract
     */
    function setLiquidityPoolToCodeProvider(address _pool, address _codeProvider) public onlyOperator returns(bool) {
        require(_codeProvider.isContract(),"!_codeProvider.isContract()");
        require(liquidityPools[_pool].isLiquidityPool,"!liquidityPools");
        liquidityPoolToCodeProvider[_pool] = _codeProvider;
        emit LogLiquidityPoolToDepositToken(msg.sender, _pool, _codeProvider);
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
     * - `_tokensHash` should be approved.
     * - msg.sender can be governance or strategist.
     * - `creditPool` in {_strategySteps} shoould be approved.
     * - `liquidityPool` in {_strategySteps} should be approved
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function setStrategy(bytes32 _tokensHash,StrategyStep[] memory _strategySteps) public onlyOperator returns(bytes32) {
        require(!_isNewTokensHash(_tokensHash),"_isNewTokensHash");
        for(uint8 i = 0 ; i < _strategySteps.length ; i++){
            require(liquidityPoolToCodeProvider[_strategySteps[i].pool] != address(0), "!codeProvider.");
        }
        bytes32[] memory hashes = new bytes32[](_strategySteps.length);
        for(uint8 i = 0 ; i < _strategySteps.length ; i++) {
            hashes[i] = keccak256(
                            abi.encodePacked(
                                _strategySteps[i].pool,
                                _strategySteps[i].outputToken,
                                _strategySteps[i].isBorrow
                            )
                        );
        }
        bytes32  hash = keccak256(abi.encodePacked(_tokensHash,hashes));
        require(_isNewStrategy(hash),"isNewStrategy");
        for(uint8 i = 0 ; i < _strategySteps.length ; i++) {
            if(_strategySteps[i].isBorrow) {
                require(creditPools[_strategySteps[i].pool].isLiquidityPool,"!isLiquidityPool");
                require(tokens[_strategySteps[i].outputToken],"!borrowToken");
            }
            else {
                require(liquidityPools[_strategySteps[i].pool].isLiquidityPool,"!isLiquidityPool");
                if (i == 0){
                    require(liquidityPoolToLPTokens[_strategySteps[i].pool][_tokensHash] == _strategySteps[i].outputToken,"!liquidityPoolToLPTokens");   
                } else {
                    address[] memory _tokenArr = new address[](1);
                    _tokenArr[0] = _strategySteps[i-1].outputToken;
                    require(liquidityPoolToLPTokens[_strategySteps[i].pool][keccak256(abi.encodePacked(_tokenArr))] == _strategySteps[i].outputToken,"!liquidityPoolToLPTokens");      
                }
            }
            strategies[hash].strategySteps.push(
                                            StrategyStep(
                                                        _strategySteps[i].pool,
                                                        _strategySteps[i].outputToken,
                                                        _strategySteps[i].isBorrow
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
     * - msg.sender should be governance.
     * - `_hash` strategy should not be revoked
     * - `_hash` strategy should exist in {strategyHashIndexes}
     */
    function revokeStrategy(bytes32 _hash) public onlyGovernance returns(bool){	    
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
     * - msg.sender should be governance.
     * - `_hash` strategy should be approved
     * - `_hash` strategy should exist in {strategyHashIndexes}
     */
    function scoreStrategy(bytes32 _hash, uint8 _score) public onlyStrategist returns(bool){
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
     function setLiquidityPoolToLPToken(address _pool, address[] memory _tokens, address _poolToken) public onlyOperator returns(bool success){
        require(liquidityPools[_pool].isLiquidityPool,"!liquidityPools.isLiquidityPool");
        // require(tokens[_poolToken],"!tokens");
        for(uint8 i = 0 ; i < _tokens.length ; i++) {
            require(tokens[_tokens[i]],"!_tokens");
        }
        bytes32 _tokensHash = keccak256(abi.encodePacked(_tokens));
        require(!_isNewTokensHash(_tokensHash),"_isNewTokensHash");
        liquidityPoolToLPTokens[_pool][_tokensHash] = _poolToken;
        liquidityPoolToTokenHashes[_pool][_poolToken] = _tokensHash;
        LogSetLiquidityPoolToLPTokens(msg.sender,_pool,_tokensHash,_poolToken);
        success = true;
    }
    
    /**
     * @dev Sets `_tokens` to keccak256 hash the {tokensHashToTokens} mapping.
     *
     * Emits a {LogSetTokensHashToTokens} event.
     *
     * Requirements:
     *
     * - msg.sender should be operator.
     * - `_tokens` should be approved
     */
    function setTokensHashToTokens(address[] memory _tokens) public onlyOperator {
        for(uint8 i = 0 ;i < _tokens.length ; i++) {
            require(tokens[_tokens[i]],"!tokens");
        }
        bytes32 _tokensHash = keccak256(abi.encodePacked(_tokens));
        require(_isNewTokensHash(_tokensHash),"!_isNewTokensHash");
        tokensHashIndexes.push(_tokensHash);
        tokensHashToTokens[_tokensHash].index = tokensHashIndexes.length - 1;
        for(uint8 i = 0 ; i < _tokens.length ;  i++) {
                 tokensHashToTokens[_tokensHash].tokens.push(_tokens[i]);   
        }
        emit LogTokensToTokensHash(msg.sender,_tokensHash);
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
    
    /**
     * @dev Emitted when liquidity pool `pool` is assigned to `codeProvider`.
     *
     * Note that `pool` should be approved in {liquidityPools}.
     */
    event LogLiquidityPoolToDepositToken(address indexed caller, address indexed pool, address indexed codeProvider);
    
    /**
     * @dev Emitted when tokens are assigned to `_tokensHash`.
     * 
     * Note that tokens should be approved
     */
     event LogTokensToTokensHash(address indexed caller, bytes32 indexed _tokensHash);
}
