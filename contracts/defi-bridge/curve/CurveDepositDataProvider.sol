// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IDepositDataProvider.sol";
import "../../interfaces/curve/ICurveDeposit.sol";
import "../../interfaces/curve/ICurveSwap.sol";
import "../../interfaces/curve/ICurveGauge.sol";
import "../../interfaces/curve/ICurveDAO.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/Modifiers.sol";

contract CurveDepositDataProvider is IDepositDataProvider,Modifiers {
    
    using SafeERC20 for IERC20;  
    
    mapping(address => address[]) public liquidityPoolToUnderlyingTokens;
    mapping(address => bool) public pools;
    mapping(address => bool) public swaps;
    
    /**
    * @dev mapp coins and tokens to curve deposit pool
    */
    constructor() public {
        address _cDAIcUSDC = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06);
        address _cDAIcUSDCUSDT = address(0xac795D2c97e60DF6a99ff1c814727302fD747a80);
        
        pools[_cDAIcUSDC] = true;
        pools[_cDAIcUSDCUSDT] = true;
        
        // cDAI + cUSDC
        address[] memory _cDAIcUSDCUnderTokens = new address[](2);
        _cDAIcUSDCUnderTokens[0] = address(0x6B175474E89094C44Da98b954EedeAC495271d0F); // DAI
        _cDAIcUSDCUnderTokens[1] = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // USDC
        setLendingPoolToUnderlyingTokens(_cDAIcUSDC,_cDAIcUSDCUnderTokens);
        
        // cDAI+cUSDC+USDT
        address[] memory cDAIcUSDCUSDTUnderTokens = new address[](3);
        cDAIcUSDCUSDTUnderTokens[0] = address(0x6B175474E89094C44Da98b954EedeAC495271d0F); // DAI
        cDAIcUSDCUSDTUnderTokens[1] = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // USDC
        cDAIcUSDCUSDTUnderTokens[2] = address(0xdAC17F958D2ee523a2206206994597C13D831ec7); // USDT
        setLendingPoolToUnderlyingTokens(_cDAIcUSDCUSDT,cDAIcUSDCUSDTUnderTokens);
        
        address _crvRenWBTC = address(0x93054188d876f558f4a66B2EF1d97d16eDf0895B);
        
        swaps[_crvRenWBTC] = true;
        
        // crvRenWBTC
        address[] memory crvRenWBTCUnderTokens = new address[](2);
        crvRenWBTCUnderTokens[0] = address(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D); // renWBTC
        crvRenWBTCUnderTokens[1] = address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599); // WBTC
        setLendingPoolToUnderlyingTokens(_crvRenWBTC,crvRenWBTCUnderTokens);
    }
    
    function setLendingPoolToUnderlyingTokens(address _lendingPool, address[] memory _tokens) public onlyGovernance {
        liquidityPoolToUnderlyingTokens[_lendingPool] = _tokens;
    }
    
    /**
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    // * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amounts Quantity of _underlyingToken to deposit
    */
    function getDepositCodes(address, address[] memory, address _liquidityPool, address _liquidityPoolToken, uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        uint N_COINS = _underlyingTokens.length;
        require (_amounts.length == N_COINS, "!_amounts.length");
        _codes = new bytes[](1);
        if (N_COINS == uint(2)) {
            _codes[0] = _getDeposit2Code(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amounts);
        }
        else if (N_COINS == uint(3)){
            _codes[0] = _getDeposit3Code(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amounts);
        }
        else if (N_COINS == uint(4)){
            _codes[0] = _getDeposit4Code(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amounts);
        }
    }
    
    /**
    * @dev Deploy function for a pool with 2 tokens
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amounts Quantity of _underlyingToken to deposit
    */
    function _getDeposit2Code(
        address[] memory ,
        address _liquidityPool,
        address ,
        uint[] memory _amounts
        ) internal pure returns(bytes memory _code){
        uint[2] memory _amountsIn;
        for(uint8 i = 0 ; i < 2 ; i++) {
            _amountsIn[i] = _amounts[i];
        }
        _code = abi.encode(_liquidityPool,abi.encodeWithSignature("add_liquidity(uint256[2],uint256)",_amountsIn,uint256(0)));
    }
    
    /**
    * @dev Deploy function for a pool with 3 tokens
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amounts Quantity of _underlyingToken to deposit
    */
    function _getDeposit3Code(
        address[] memory ,
        address _liquidityPool,
        address ,
        uint[] memory _amounts) internal pure returns(bytes memory _code){
        uint[3] memory _amountsIn;
        for(uint8 i = 0 ; i < 3 ; i++){
            _amountsIn[i] = _amounts[i];        
        }
        _code = abi.encode(_liquidityPool,abi.encodeWithSignature("add_liquidity(uint256[3],uint256)",_amountsIn,uint256(0)));
    }
    
    /**
    * @dev Deploy function for a pool with 4 tokens
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amounts Quantity of _underlyingToken to deposit
    */
    function _getDeposit4Code(
        address[] memory ,
        address _liquidityPool,
        address ,
        uint[] memory _amounts
        ) internal pure returns(bytes memory _code){
        uint[4] memory _amountsIn;
        for(uint8 i = 0 ; i < 3 ; i++){
            _amountsIn[i] = _amounts[i];
        }
        _code = abi.encode(_liquidityPool,abi.encodeWithSignature("add_liquidity(uint256[4],uint256)",_amountsIn,uint256(0)));
    }
    
    /**
    * @dev Swaps _amount of _liquidityPoolToken for _underlyingToken
    * 
    * @param _liquidityPool Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _liquidityPoolToken to swap for _underlyingToken
    */
    function getWithdrawCodes(address, address[] memory _underlyingTokens, address _liquidityPool, address _liquidityPoolToken, uint _amount) public override view returns(bytes[] memory _codes) {
        uint N_COINS = _underlyingTokens.length;
        _codes = new bytes[](1);
        if (N_COINS == uint(1)){
            _codes[0] = _getWithdraw1Code(_underlyingTokens[0], _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(2)){
            _codes[0] = _getWithdraw2Code(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(3)){
            _codes[0] = _getWithdraw3Code(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(4)){
            _codes[0] = _getWithdraw4Code(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amount);
        }
    }
        
    /**
    * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
    */
    function _getWithdraw1Code(
        address _underlyingToken,
        address _liquidityPool,
        address ,
        uint _amount
        ) internal view returns(bytes memory _code) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        int128 i = 0;
        for(uint8 j = 0 ; j < _underlyingTokens.length ; j++){
            if(_underlyingTokens[j] == _underlyingToken) {
                i = j;
            }
        }
        if(pools[_liquidityPool]) {
            _code = abi.encode(_liquidityPool,abi.encodeWithSignature("remove_liquidity_one_coin(uint256,int128,uint256,bool)",_amount,i,uint256(0),true));
        }
        if(swaps[_liquidityPool]) {
            _code = abi.encode(_liquidityPool,abi.encodeWithSignature("remove_liquidity_one_coin(uint256,int128,uint256)",_amount,i,uint256(0)));
        }
    }

    /**
    * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
    */
    function _getWithdraw2Code(
        address[] memory ,
        address _liquidityPool,
        address ,
        uint  _amount
        ) internal pure returns(bytes memory _code) {
        uint[2] memory _minAmountOut = [uint(0), uint(0)];
        _code = abi.encode(_liquidityPool,abi.encodeWithSignature("remove_liquidity(uint256,uint256[2])",_amount,_minAmountOut));
    }

    /**
    * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
    */
    function _getWithdraw3Code(
        address[] memory ,
        address _liquidityPool,
        address ,
        uint _amount
        ) internal pure returns(bytes memory _code) {
        uint[3] memory _minAmountOut = [uint(0), uint(0), uint(0)];
        _code = abi.encode(_liquidityPool,abi.encodeWithSignature("remove_liquidity(uint256,uint256[3])",_amount,_minAmountOut));
    }
    
    /**
    * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
    */
    function _getWithdraw4Code(
        address[] memory ,
        address _liquidityPool,
        address ,
        uint _amount
        ) internal pure returns(bytes memory _code) {
        uint[4] memory _minAmountOut = [uint(0), uint(0), uint(0), uint(0)];
        _code = abi.encode(_liquidityPool,abi.encodeWithSignature("remove_liquidity(uint256,uint256[4])",_amount,_minAmountOut));
    }
    
    function getLiquidityPoolToken(address, address _liquidityPool) public override view returns(address) {
        return ICurveDeposit(_liquidityPool).token();
    }
    
    function getUnderlyingTokens(address _liquidityPool , address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = liquidityPoolToUnderlyingTokens[_liquidityPool];
    }
    
    function _getUnderlyingTokens(address  _liquidityPool) internal view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = liquidityPoolToUnderlyingTokens[_liquidityPool];
    }
    
    /** 
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
    *      the user's balance in _liquidityPoolToken
    */
    function calculateAmountInToken(
        address _underlyingToken,  
        address _liquidityPool, 
        address ,
        uint _liquidityPoolTokenAmount
        ) public override view returns(uint) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        int128 tokenIndex = 0;
        for(uint8 i = 0 ; i < _underlyingTokens.length ; i++) {
            if(_underlyingTokens[i] == _underlyingToken) {
                tokenIndex = i;
            }
        }
        if(_liquidityPoolTokenAmount > 0) {
            return ICurveDeposit(_liquidityPool).calc_withdraw_one_coin(_liquidityPoolTokenAmount, tokenIndex);
        }
        return 0;
    }
    
    /** 
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
    *      the user's balance in _liquidityPoolToken
    */
    function balanceInToken(
        address _underlyingToken,
        address _liquidityPool, 
        address _liquidityPoolToken, 
        address _holder
        ) public override view returns(uint) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        int128 tokenIndex = 0;
        for(uint8 i = 0 ; i < _underlyingTokens.length ; i++) {
            if(_underlyingTokens[i] == _underlyingToken) {
                tokenIndex = i;
            }
        }
        uint _liquidityPoolTokenAmount = IERC20(_liquidityPoolToken).balanceOf(_holder);
        if(_liquidityPoolTokenAmount > 0) {
            return ICurveDeposit(_liquidityPool).calc_withdraw_one_coin(_liquidityPoolTokenAmount, tokenIndex);
        }
        return 0;
    }
    
    /** 
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
    *      the user's balance in _liquidityPoolToken
    */
    function calculateAmountInLPToken(
        address ,  
        address , 
        address ,
        uint 
        ) public override view returns(uint) {
        revert("not-implemented");
    }
    
    /** 
    * @dev Deposits _amount of _liquidityPoolToken in _liquidityPoolGauge to generate CRV rewards
    * 
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _liquidityPoolGauge Address of the gauge associated to the pool
    * @param _amount Quantity of _liquidityPoolToken to deposit in the gauge
    */
    function stakeLPtokens(address _liquidityPoolToken, address _liquidityPoolGauge, uint _amount) public returns(bool){
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPoolGauge, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPoolGauge, uint(_amount));
        ICurveGauge(_liquidityPoolGauge).deposit(_amount);
        return true;
    }
    
    /** 
    * @dev Withdraws _amount of _liquidityPoolToken from _liquidityPoolToken and claims CRV rewards
    * 
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _liquidityPoolGauge Address of the gauge associated to the pool
    * @param _amount Quantity of _liquidityPoolToken to withdraw from the gauge
    */
    function unstakeLPtokens(address _liquidityPoolToken, address _liquidityPoolGauge, uint _amount) public returns(bool){
        ICurveGauge(_liquidityPoolGauge).withdraw(_amount);
        address tokenMinter = 0xd061D61a4d941c39E5453435B6345Dc261C2fcE0;
        address crvToken = 0xD533a949740bb3306d119CC777fa900bA034cd52;
        ICurveDAO(tokenMinter).mint(_liquidityPoolGauge);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, IERC20(_liquidityPoolToken).balanceOf(address(this)));
        IERC20(crvToken).safeTransfer(msg.sender, IERC20(crvToken).balanceOf(address(this)));
        return true;
    }
}

// Curve Compound useful addresses:

// address _DAItoken = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
// address _USDCtoken = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
// address _CurveCompoundLPToken = address(0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2);
// address _CurveCompoundDepositContract = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06);
// address _CurveCompoundGaugeContract = address(0x7ca5b0a2910B33e9759DC7dDB0413949071D7575);

// array dai-usdc = ["0x6B175474E89094C44Da98b954EedeAC495271d0F","0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"]
