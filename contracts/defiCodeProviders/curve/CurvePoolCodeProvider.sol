// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/curve/ICurveDeposit.sol";
import "../../interfaces/curve/ICurveGauge.sol";
import "../../interfaces/curve/ICurveDAO.sol";
import "../../interfaces/curve/ITokenMinter.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/Modifiers.sol";

contract CurvePoolCodeProvider is ICodeProvider,Modifiers {
    
    using SafeERC20 for IERC20;  
    
    mapping(address => address[]) public liquidityPoolToUnderlyingTokens;
    mapping(address => address) public liquidityPoolToGauges;
    
    // reward token
    address public crv = address(0xD533a949740bb3306d119CC777fa900bA034cd52);
    address public tokenMinter = address(0xd061D61a4d941c39E5453435B6345Dc261C2fcE0);
    
    // underlying token
    address public constant DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant USDT = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    address public constant PAX = address(0x8E870D67F660D95d5be530380D0eC0bd388289E1);
    address public constant TUSD = address(0x0000000000085d4780B73119b644AE5ecd22b376);
    address public constant BUSD = address(0x4Fabb145d64652a948d72533023f6E7A623C7C53);
    address public constant SUSD = address(0x57Ab1ec28D129707052df4dF418D58a2D46d5f51);
    
    // deposit pool
    address public constant compoundDepositPool = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06); 
    address public constant usdtDepositPool = address(0xac795D2c97e60DF6a99ff1c814727302fD747a80);
    address public constant paxDepositPool = address(0xA50cCc70b6a011CffDdf45057E39679379187287);
    address public constant yDepositPool = address(0xbBC81d23Ea2c3ec7e56D39296F0cbB648873a5d3);
    address public constant busdDepositPool = address(0x0000000000085d4780B73119b644AE5ecd22b376);
    address public constant susdDepositPool = address(0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490);

    /**
    * @dev map coins and tokens to curve deposit pool
    */
    constructor() public {
        
        // deposit pool
        address[] memory _compoundUnderlyingTokens = new address[](2);
        _compoundUnderlyingTokens[0] = DAI;
        _compoundUnderlyingTokens[1] = USDC;
        setLiquidityPoolToUnderlyingTokens(compoundDepositPool,_compoundUnderlyingTokens);
        
        address[] memory _usdtUnderlyingTokens = new address[](3);
        _usdtUnderlyingTokens[0] = DAI;
        _usdtUnderlyingTokens[1] = USDC;
        _usdtUnderlyingTokens[2] = USDT;
        setLiquidityPoolToUnderlyingTokens(usdtDepositPool,_usdtUnderlyingTokens);
        
        address[] memory _paxUnderlyingTokens = new address[](4);
        _paxUnderlyingTokens[0] = DAI;
        _paxUnderlyingTokens[1] = USDC;
        _paxUnderlyingTokens[2] = USDT;
        _paxUnderlyingTokens[3] = PAX;
        setLiquidityPoolToUnderlyingTokens(paxDepositPool,_paxUnderlyingTokens);
        
        address[] memory _yUnderlyingTokens = new address[](4);
        _yUnderlyingTokens[0] = DAI;
        _yUnderlyingTokens[1] = USDC;
        _yUnderlyingTokens[2] = USDT;
        _yUnderlyingTokens[3] = TUSD;
        setLiquidityPoolToUnderlyingTokens(yDepositPool,_yUnderlyingTokens);
        
        address[] memory _busdUnderlyingTokens = new address[](4);
        _busdUnderlyingTokens[0] = DAI;
        _busdUnderlyingTokens[1] = USDC;
        _busdUnderlyingTokens[2] = USDT;
        _busdUnderlyingTokens[3] = BUSD;
        setLiquidityPoolToUnderlyingTokens(busdDepositPool,_busdUnderlyingTokens);
        
        address[] memory _susdUnderlyingTokens = new address[](4);
        _susdUnderlyingTokens[0] = DAI;
        _susdUnderlyingTokens[1] = USDC;
        _susdUnderlyingTokens[2] = USDT;
        _susdUnderlyingTokens[3] = SUSD;
        setLiquidityPoolToUnderlyingTokens(susdDepositPool,_susdUnderlyingTokens);
        
        // set liquidity pool to gauges
        setLiquiidtyPoolToGauges(compoundDepositPool,address(0x7ca5b0a2910B33e9759DC7dDB0413949071D7575));
        setLiquiidtyPoolToGauges(usdtDepositPool,address(0xBC89cd85491d81C6AD2954E6d0362Ee29fCa8F53));
        setLiquiidtyPoolToGauges(paxDepositPool,address(0x64E3C23bfc40722d3B649844055F1D51c1ac041d));
        setLiquiidtyPoolToGauges(yDepositPool,address(0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1));
        setLiquiidtyPoolToGauges(busdDepositPool,address(0x69Fb7c45726cfE2baDeE8317005d3F94bE838840));
        setLiquiidtyPoolToGauges(susdDepositPool,address(0xA90996896660DEcC6E997655E065b23788857849));
    }
    
    function setLiquidityPoolToUnderlyingTokens(address _lendingPool, address[] memory _tokens) public onlyGovernance {
        liquidityPoolToUnderlyingTokens[_lendingPool] = _tokens;
    }
    
    function setLiquiidtyPoolToGauges(address _pool, address _gauge) public onlyGovernance {
        liquidityPoolToGauges[_pool] = _gauge;
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
        _code = abi.encode(_liquidityPool,abi.encodeWithSignature("remove_liquidity_one_coin(uint256,int128,uint256,bool)",_amount,i,uint256(0),true));
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
        address crvToken = ITokenMinter(tokenMinter).token();
        ICurveDAO(tokenMinter).mint(_liquidityPoolGauge);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, IERC20(_liquidityPoolToken).balanceOf(address(this)));
        IERC20(crvToken).safeTransfer(msg.sender, IERC20(crvToken).balanceOf(address(this)));
        return true;
    }
    
    function canStake(address , address , address , address , uint ) public override view returns(bool) {
        return true;
    }
    
    function getRewardToken(address , address , address _liquidityPool, address) public override view returns(address) {
        if(liquidityPoolToGauges[_liquidityPool] != address(0)) {
            return ITokenMinter(getMinter(liquidityPoolToGauges[_liquidityPool])).token();
        }
        return address(0);
    }
    
    function getUnclaimedRewardTokenAmount(address , address , address _liquidityPool, address) public override view returns(uint256){
        if(liquidityPoolToGauges[_liquidityPool] != address(0)) {
            // TODO : get the amount of unclaimed CRV tokens
        }
        return uint(0);
    }
    
    function getClaimRewardTokenCode(address, address, address _liquidityPool, address) public override view returns(bytes[] memory _codes) {
        if(liquidityPoolToGauges[_liquidityPool] != address(0)) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(getMinter(liquidityPoolToGauges[_liquidityPool]),abi.encodeWithSignature("mint(address)",liquidityPoolToGauges[_liquidityPool]));
        }
    }
    
    function getMinter(address _gauge) public view returns(address) {
        return ICurveGauge(_gauge).minter();
    }
}
