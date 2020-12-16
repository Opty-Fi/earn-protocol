// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/curve/ICurveSwap.sol";
import "../../interfaces/curve/ICurveGauge.sol";
import "../../interfaces/curve/ICurveDAO.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/Modifiers.sol";

contract CurveSwapCodeProvider is ICodeProvider,Modifiers {
    
    using SafeERC20 for IERC20;  
    
    mapping(address => address[]) public swapPoolToUnderlyingTokens;
    mapping(address => address) public swapPoolToLiquidityPoolToken;
    
    // reward token
    address public crv = address(0xD533a949740bb3306d119CC777fa900bA034cd52);
    
    // underlying token
    address public constant DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant USDT = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    address public constant PAX = address(0x8E870D67F660D95d5be530380D0eC0bd388289E1);
    address public constant SUSD = address(0x57Ab1ec28D129707052df4dF418D58a2D46d5f51);
    address public constant renBTC = address(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D);
    address public constant WBTC = address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
    address public constant SBTC = address(0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6);
    address public constant HBTC = address(0x0316EB71485b0Ab14103307bf65a021042c6d380);
    address public constant GUSD = address(0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd);
    address public constant HUSD = address(0xdF574c24545E5FfEcb9a659c229253D4111d87e1);
    address public constant USDK = address(0x1c48f86ae57291F7686349F12601910BD8D470bb);
    address public constant USDN = address(0x1c48f86ae57291F7686349F12601910BD8D470bb);
    address public constant LINKUSD = address(0x0E2EC54fC0B509F445631Bf4b91AB8168230C752);
    address public constant MUSD = address(0xe2f2a5C287993345a840Db3B0845fbC70f5935a5);
    address public constant RSV = address(0x196f4727526eA7FB1e17b2071B3d8eAA38486988);
    address public constant TBTC = address(0x8dAEBADE922dF735c38C80C7eBD708Af50815fAa);
    address public constant CDAI = address(0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643);
    address public constant CUSDC = address(0x39AA39c021dfbaE8faC545936693aC917d5E7563);
    address public constant YCDAI = address(0x99d1Fa417f94dcD62BfE781a1213c092a47041Bc);
    address public constant YCUSDC = address(0x9777d7E2b60bB01759D0E2f8be2095df444cb07E);
    address public constant YCUSDT = address(0x1bE5d71F2dA660BFdee8012dDc58D024448A0A59);
    address public constant YDAI = address(0xC2cB1040220768554cf699b0d863A3cd4324ce32);
    address public constant YUSDC = address(0x26EA744E5B887E5205727f55dFBE8685e3b21951);
    address public constant YUSDT =  address(0xE6354ed5bC4b393a5Aad09f21c46E101e692d447);
    address public constant YTUSD = address(0x73a052500105205d34Daf004eAb301916DA8190f);
    address public constant YBUSD =  address(0x04bC0Ab673d88aE9dbC9DA2380cB6B79C4BCa9aE);

    // swap pool
    address public constant compoundSwapPool = address(0xA2B47E3D5c44877cca798226B7B8118F9BFb7A56);
    address public constant usdtSwapPool = address(0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C);
    address public constant paxSwapPool = address(0x06364f10B501e868329afBc005b3492902d6C763);
    address public constant ySwapPool = address(0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51);
    address public constant busdSwapPool = address(0x79a8C46DeA5aDa233ABaFFD40F3A0A2B1e5A4F27);
    address public constant susdSwapPool = address(0xA5407eAE9Ba41422680e2e00537571bcC53efBfD);
    address public constant renSwapPool = address(0x93054188d876f558f4a66B2EF1d97d16eDf0895B);
    address public constant sBTCSwapPool = address(0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714);
    address public constant hBTCSwapPool = address(0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F);
    address public constant threeSwapPool = address(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);
    address public constant gusdSwapPool = address(0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956);
    address public constant husdSwapPool = address(0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604);
    address public constant usdkSwapPool = address(0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb);
    address public constant usdnSwapPool = address(0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1);
    address public constant linkusdSwapPool = address(0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171);
    address public constant musdSwapPool = address(0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6);
    address public constant rsvSwapPool = address(0xC18cC39da8b11dA8c3541C598eE022258F9744da);
    address public constant tbtcSwapPool = address(0xC25099792E9349C7DD09759744ea681C7de2cb66);
    
    // liquidity pool tokens
    address public constant cDAIcUSDC = address(0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2);
    address public constant cDAIcUSDCUSDT = address(0x9fC689CCaDa600B6DF723D9E47D84d76664a1F23);
    address public constant ypaxCrv = address(0xD905e2eaeBe188fc92179b6350807D8bd91Db0D8);
    address public constant yDAIyUSDCyUSDTyTUSD = address(0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8);
    address public constant yDAIyUSDCyUSDTyBUSD = address(0x3B3Ac5386837Dc563660FB6a0937DFAa5924333B);
    address public constant crvPlain3andSUSD = address(0xC25a3A3b969415c80451098fa907EC722572917F);
    address public constant crvRenWBTC = address(0x49849C98ae39Fff122806C06791Fa73784FB3675);
    address public constant crvRenBTCwBTCsBTC = address(0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3);
    address public constant hCRV = address(0xb19059ebb43466C323583928285a49f558E572Fd);
    address public constant _3Crv = address(0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490);
    address public constant gusd3Crv = address(0xD2967f45c4f384DEEa880F807Be904762a3DeA07);
    address public constant husd3Crv = address(0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858);
    address public constant usdk3Crv = address(0x97E2768e8E73511cA874545DC5Ff8067eB19B787);
    address public constant usdn3Crv = address(0x4f3E8F405CF5aFC05D68142F3783bDfE13811522);
    address public constant LinkUSD3Crv = address(0x6D65b498cb23deAba52db31c93Da9BFFb340FB8F);
    address public constant musd3Crv = address(0x1AEf73d49Dedc4b1778d0706583995958Dc862e6);
    address public constant rsv3Crv = address(0xC2Ee6b0334C261ED60C72f6054450b61B8f18E35);
    address public constant tbtcsbtcCrv = address(0x64eda51d3Ad40D56b9dFc5554E06F94e1Dd786Fd);
    address public constant dusd3Crv = address(0x3a664Ab939FD8482048609f652f9a0B0677337B9);
    
    /**
    * @dev mapp coins and tokens to curve deposit pool
    */
    constructor() public {
        // swap pool
        address[] memory _compoundUnderTokens = new address[](2);
        _compoundUnderTokens[0] = CDAI; 
        _compoundUnderTokens[1] = CUSDC;
        setLiquidityPoolToken(compoundSwapPool,cDAIcUSDC);
        setSwapPoolToUnderlyingTokens(compoundSwapPool,_compoundUnderTokens);
        
        address[] memory _usdtUnderTokens = new address[](3);
        _usdtUnderTokens[0] = CDAI;
        _usdtUnderTokens[1] = CUSDC;
        _usdtUnderTokens[2] = USDT;
        setLiquidityPoolToken(usdtSwapPool,cDAIcUSDCUSDT);
        setSwapPoolToUnderlyingTokens(usdtSwapPool,_usdtUnderTokens);
        
        address[] memory _paxUnderTokens = new address[](4);
        _paxUnderTokens[0] = YCDAI;
        _paxUnderTokens[1] = YCUSDC;
        _paxUnderTokens[2] = YCUSDT;
        _paxUnderTokens[3] = PAX;
        setLiquidityPoolToken(paxSwapPool,ypaxCrv);
        setSwapPoolToUnderlyingTokens(paxSwapPool,_paxUnderTokens);
        
        address[] memory _yUnderTokens = new address[](4);
        _yUnderTokens[0] = YDAI;
        _yUnderTokens[1] = YUSDC;
        _yUnderTokens[2] = YUSDT;
        _yUnderTokens[3] = YTUSD;
        setLiquidityPoolToken(ySwapPool,yDAIyUSDCyUSDTyTUSD);
        setSwapPoolToUnderlyingTokens(ySwapPool,_yUnderTokens);
        
        address[] memory _busdUnderTokens = new address[](4);
        _busdUnderTokens[0] = YDAI;
        _busdUnderTokens[1] = YUSDC;
        _busdUnderTokens[2] = YUSDT;
        _busdUnderTokens[3] = YBUSD;
        setLiquidityPoolToken(busdSwapPool,yDAIyUSDCyUSDTyBUSD);
        setSwapPoolToUnderlyingTokens(busdSwapPool,_compoundUnderTokens);
        
        address[] memory _susdUnderTokens = new address[](4);
        _susdUnderTokens[0] = DAI;
        _susdUnderTokens[1] = USDC;
        _susdUnderTokens[2] = USDT;
        _susdUnderTokens[3] = SUSD;
        setLiquidityPoolToken(susdSwapPool,crvPlain3andSUSD);
        setSwapPoolToUnderlyingTokens(susdSwapPool,_susdUnderTokens);
        
        address[] memory _crvrenBTCwBTCUnderTokens = new address[](2);
        _crvrenBTCwBTCUnderTokens[0] = renBTC;
        _crvrenBTCwBTCUnderTokens[1] = WBTC;
        setLiquidityPoolToken(renSwapPool,crvRenWBTC);
        setSwapPoolToUnderlyingTokens(renSwapPool,_crvrenBTCwBTCUnderTokens);
        
        address[] memory _crvrenBTCwBTCsBTCUnderTokens = new address[](3);
        _crvrenBTCwBTCsBTCUnderTokens[0] = renBTC;
        _crvrenBTCwBTCsBTCUnderTokens[1] = WBTC;
        _crvrenBTCwBTCsBTCUnderTokens[2] = SBTC;
        setLiquidityPoolToken(sBTCSwapPool,crvRenBTCwBTCsBTC);
        setSwapPoolToUnderlyingTokens(sBTCSwapPool,_crvrenBTCwBTCsBTCUnderTokens);

        address[] memory _crvhBTCwBTCUnderTokens = new address[](2);
        _crvhBTCwBTCUnderTokens[0] = HBTC;
        _crvhBTCwBTCUnderTokens[1] = WBTC;
        setLiquidityPoolToken(hBTCSwapPool,hCRV);
        setSwapPoolToUnderlyingTokens(hBTCSwapPool,_crvhBTCwBTCUnderTokens);
        
        address[] memory _crvDAIUSDCUSDTUnderTokens = new address[](3);
        _crvDAIUSDCUSDTUnderTokens[0] = DAI;
        _crvDAIUSDCUSDTUnderTokens[1] = USDC;
        _crvDAIUSDCUSDTUnderTokens[2] = USDT;
        setLiquidityPoolToken(threeSwapPool,_3Crv);
        setSwapPoolToUnderlyingTokens(threeSwapPool,_crvDAIUSDCUSDTUnderTokens);
        
        address[] memory _gusdUnderlyingTokens = new address[](2);
        _gusdUnderlyingTokens[0] = GUSD;
        _gusdUnderlyingTokens[1] = _3Crv;
        setLiquidityPoolToken(gusdSwapPool,gusd3Crv);
        setSwapPoolToUnderlyingTokens(gusdSwapPool,_gusdUnderlyingTokens);
        
        address[] memory _husdUnderlyingTokens = new address[](2);
        _husdUnderlyingTokens[0] = HUSD;
        _husdUnderlyingTokens[1] = _3Crv;
        setLiquidityPoolToken(husdSwapPool,husd3Crv);
        setSwapPoolToUnderlyingTokens(husdSwapPool,_husdUnderlyingTokens);
        
        address[] memory _usdkUnderlyingTokens = new address[](2);
        _usdkUnderlyingTokens[0] = USDK;
        _usdkUnderlyingTokens[1] = _3Crv;
        setLiquidityPoolToken(usdkSwapPool,usdk3Crv);
        setSwapPoolToUnderlyingTokens(usdkSwapPool,_usdkUnderlyingTokens);
        
        address[] memory _usdnUnderlyingTokens = new address[](2);
        _usdnUnderlyingTokens[0] = USDN;
        _usdnUnderlyingTokens[1] = _3Crv;
        setLiquidityPoolToken(usdnSwapPool,LinkUSD3Crv);
        setSwapPoolToUnderlyingTokens(usdkSwapPool,_usdnUnderlyingTokens);
        
        address[] memory _linkusdUnderlyingTokens = new address[](2);
        _linkusdUnderlyingTokens[0] = LINKUSD;
        _linkusdUnderlyingTokens[1] = _3Crv;
        setLiquidityPoolToken(linkusdSwapPool,musd3Crv);
        setSwapPoolToUnderlyingTokens(linkusdSwapPool,_linkusdUnderlyingTokens);
        
        address[] memory _musdUnderlyingTokens = new address[](2);
        _musdUnderlyingTokens[0] = MUSD;
        _musdUnderlyingTokens[1] = _3Crv;
        setLiquidityPoolToken(musdSwapPool,rsv3Crv);
        setSwapPoolToUnderlyingTokens(musdSwapPool,_musdUnderlyingTokens);
        
        address[] memory _rsvUnderlyingTokens = new address[](2);
        _rsvUnderlyingTokens[0] = RSV;
        _rsvUnderlyingTokens[1] = _3Crv;
        setLiquidityPoolToken(rsvSwapPool,tbtcsbtcCrv);
        setSwapPoolToUnderlyingTokens(rsvSwapPool,_rsvUnderlyingTokens);
        
        address[] memory _tbtcUnderlyingTokens = new address[](2);
        _tbtcUnderlyingTokens[0] = TBTC;
        _tbtcUnderlyingTokens[1] = _3Crv;
        setLiquidityPoolToken(tbtcSwapPool,dusd3Crv);
        setSwapPoolToUnderlyingTokens(tbtcSwapPool,_tbtcUnderlyingTokens);
    }
    
    function setLiquidityPoolToken(address _swapPool,address _liquidityPoolToken) public onlyGovernance {
        swapPoolToLiquidityPoolToken[_swapPool] = _liquidityPoolToken;
    }
    
    function setSwapPoolToUnderlyingTokens(address _lendingPool, address[] memory _tokens) public onlyGovernance {
        swapPoolToUnderlyingTokens[_lendingPool] = _tokens;
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
       
        _code = abi.encode(_liquidityPool,abi.encodeWithSignature("remove_liquidity_one_coin(uint256,int128,uint256)",_amount,i,uint256(0)));
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
        return swapPoolToLiquidityPoolToken[_liquidityPool];
    }
    
    function getUnderlyingTokens(address _liquidityPool , address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = swapPoolToUnderlyingTokens[_liquidityPool];
    }
    
    function _getUnderlyingTokens(address  _liquidityPool) internal view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = swapPoolToUnderlyingTokens[_liquidityPool];
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
            return ICurveSwap(_liquidityPool).calc_withdraw_one_coin(_liquidityPoolTokenAmount, tokenIndex);
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
            return ICurveSwap(_liquidityPool).calc_withdraw_one_coin(_liquidityPoolTokenAmount, tokenIndex);
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
    
    function canStake(address , address , address , address , uint ) public override view returns(bool) {
        return false;
    }
    
     function getRewardToken(address , address , address , address ) public override view returns(address) {
         return crv;
     }
}

// Curve Compound useful addresses:

// address _DAItoken = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
// address _USDCtoken = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
// address _CurveCompoundLPToken = address(0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2);
// address _CurveCompoundDepositContract = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06);
// address _CurveCompoundGaugeContract = address(0x7ca5b0a2910B33e9759DC7dDB0413949071D7575);

// array dai-usdc = ["0x6B175474E89094C44Da98b954EedeAC495271d0F","0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"]
