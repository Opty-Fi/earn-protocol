// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/curve/ICurveDeposit.sol";
import "../../interfaces/curve/ICurveGauge.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../utils/Modifiers.sol";
import "../../Gatherer.sol";

contract CurveSwapCodeProvider is ICodeProvider, Modifiers {
    using SafeMath for uint256;

    mapping(address => address[]) public swapPoolToUnderlyingTokens;
    mapping(address => address) public swapPoolToLiquidityPoolToken;
    mapping(address => address) public swapPoolToGauges;
    mapping(address => bool) public noRemoveLiquidityOneCoin;
    Gatherer public gathererContract;
    uint256 public maxExposure; // basis points

    // reward token
    address public rewardToken;

    // underlying token
    address public constant DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant USDT = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    address public constant PAX = address(0x8E870D67F660D95d5be530380D0eC0bd388289E1);
    address public constant SUSD = address(0x57Ab1ec28D129707052df4dF418D58a2D46d5f51);
    address public constant REN_BTC = address(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D);
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
    address public constant YUSDT = address(0xE6354ed5bC4b393a5Aad09f21c46E101e692d447);
    address public constant YTUSD = address(0x73a052500105205d34Daf004eAb301916DA8190f);
    address public constant YBUSD = address(0x04bC0Ab673d88aE9dbC9DA2380cB6B79C4BCa9aE);

    // swap pool
    address public constant COMPOUND_SWAP_POOL = address(0xA2B47E3D5c44877cca798226B7B8118F9BFb7A56);
    address public constant USDT_SWAP_POOL = address(0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C);
    address public constant PAX_SWAP_POOL = address(0x06364f10B501e868329afBc005b3492902d6C763);
    address public constant Y_SWAP_POOL = address(0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51);
    address public constant BUSD_SWAP_POOL = address(0x79a8C46DeA5aDa233ABaFFD40F3A0A2B1e5A4F27);
    address public constant SUSD_SWAP_POOL = address(0xA5407eAE9Ba41422680e2e00537571bcC53efBfD);
    address public constant REN_SWAP_POOL = address(0x93054188d876f558f4a66B2EF1d97d16eDf0895B);
    address public constant SBTC_SWAP_POOL = address(0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714);
    address public constant HBTC_SWAP_POOL = address(0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F);
    address public constant THREE_SWAP_POOL = address(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);
    address public constant GUSD_SWAP_POOL = address(0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956);
    address public constant HUSD_SWAP_POOL = address(0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604);
    address public constant USDK_SWAP_POOL = address(0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb);
    address public constant USDN_SWAP_POOL = address(0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1);
    address public constant LINKUSD_SWAP_POOL = address(0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171);
    address public constant MUSD_SWAP_POOL = address(0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6);
    address public constant RSV_SWAP_POOL = address(0xC18cC39da8b11dA8c3541C598eE022258F9744da);
    address public constant TBTC_SWAP_POOL = address(0xC25099792E9349C7DD09759744ea681C7de2cb66);
    address public constant DUSD_SWAP_POOL = address(0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c);

    // liquidity pool tokens
    address public constant CDAI_CUSDC = address(0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2);
    address public constant CDAI_CUSD_CUSDT = address(0x9fC689CCaDa600B6DF723D9E47D84d76664a1F23);
    address public constant Y_PAX_CRV = address(0xD905e2eaeBe188fc92179b6350807D8bd91Db0D8);
    address public constant YDAI_YUSDC_YUSDT_YTUSD = address(0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8);
    address public constant YDAI_YUSDC_YUSDT_YBUSD = address(0x3B3Ac5386837Dc563660FB6a0937DFAa5924333B);
    address public constant CRV_PLAIN_3_AND_SUSD = address(0xC25a3A3b969415c80451098fa907EC722572917F);
    address public constant CRV_REN_WBTC = address(0x49849C98ae39Fff122806C06791Fa73784FB3675);
    address public constant CRV_REN_BTC_WBTC_SBTC = address(0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3);
    address public constant HCRV = address(0xb19059ebb43466C323583928285a49f558E572Fd);
    address public constant THREE_CRV = address(0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490);
    address public constant GUSD_THREE_CRV = address(0xD2967f45c4f384DEEa880F807Be904762a3DeA07);
    address public constant HUSD_THREE_CRV = address(0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858);
    address public constant USDK_THREE_CRV = address(0x97E2768e8E73511cA874545DC5Ff8067eB19B787);
    address public constant USDN_THREE_CRV = address(0x4f3E8F405CF5aFC05D68142F3783bDfE13811522);
    address public constant LINKUSD_THREE_CRV = address(0x6D65b498cb23deAba52db31c93Da9BFFb340FB8F);
    address public constant MUSD_THREE_CRV = address(0x1AEf73d49Dedc4b1778d0706583995958Dc862e6);
    address public constant RSV_THREE_CRV = address(0xC2Ee6b0334C261ED60C72f6054450b61B8f18E35);
    address public constant TBTC_SBTC_CRV = address(0x64eda51d3Ad40D56b9dFc5554E06F94e1Dd786Fd);
    address public constant DUSD_THREE_CRV = address(0x3a664Ab939FD8482048609f652f9a0B0677337B9);

    /**
     * @dev mapp coins and tokens to curve deposit pool
     */
    constructor(address _registry, address _gatherer) public Modifiers(_registry) {
        setGatherer(_gatherer);
        // reward token
        setRewardToken(address(0xD533a949740bb3306d119CC777fa900bA034cd52));

        // swap pool
        address[] memory _compoundUnderTokens = new address[](2);
        _compoundUnderTokens[0] = CDAI;
        _compoundUnderTokens[1] = CUSDC;
        setLiquidityPoolToken(COMPOUND_SWAP_POOL, CDAI_CUSDC);
        setSwapPoolToUnderlyingTokens(COMPOUND_SWAP_POOL, _compoundUnderTokens);
        toggleNoRemoveLiquidityOneCoin(COMPOUND_SWAP_POOL);

        address[] memory _usdtUnderTokens = new address[](3);
        _usdtUnderTokens[0] = CDAI;
        _usdtUnderTokens[1] = CUSDC;
        _usdtUnderTokens[2] = USDT;
        setLiquidityPoolToken(USDT_SWAP_POOL, CDAI_CUSD_CUSDT);
        setSwapPoolToUnderlyingTokens(USDT_SWAP_POOL, _usdtUnderTokens);
        toggleNoRemoveLiquidityOneCoin(USDT_SWAP_POOL);

        address[] memory _paxUnderTokens = new address[](4);
        _paxUnderTokens[0] = YCDAI;
        _paxUnderTokens[1] = YCUSDC;
        _paxUnderTokens[2] = YCUSDT;
        _paxUnderTokens[3] = PAX;
        setLiquidityPoolToken(PAX_SWAP_POOL, Y_PAX_CRV);
        setSwapPoolToUnderlyingTokens(PAX_SWAP_POOL, _paxUnderTokens);
        toggleNoRemoveLiquidityOneCoin(PAX_SWAP_POOL);

        address[] memory _yUnderTokens = new address[](4);
        _yUnderTokens[0] = YDAI;
        _yUnderTokens[1] = YUSDC;
        _yUnderTokens[2] = YUSDT;
        _yUnderTokens[3] = YTUSD;
        setLiquidityPoolToken(Y_SWAP_POOL, YDAI_YUSDC_YUSDT_YTUSD);
        setSwapPoolToUnderlyingTokens(Y_SWAP_POOL, _yUnderTokens);
        toggleNoRemoveLiquidityOneCoin(Y_SWAP_POOL);

        address[] memory _busdUnderTokens = new address[](4);
        _busdUnderTokens[0] = YDAI;
        _busdUnderTokens[1] = YUSDC;
        _busdUnderTokens[2] = YUSDT;
        _busdUnderTokens[3] = YBUSD;
        setLiquidityPoolToken(BUSD_SWAP_POOL, YDAI_YUSDC_YUSDT_YBUSD);
        setSwapPoolToUnderlyingTokens(BUSD_SWAP_POOL, _compoundUnderTokens);
        toggleNoRemoveLiquidityOneCoin(BUSD_SWAP_POOL);

        address[] memory _susdUnderTokens = new address[](4);
        _susdUnderTokens[0] = DAI;
        _susdUnderTokens[1] = USDC;
        _susdUnderTokens[2] = USDT;
        _susdUnderTokens[3] = SUSD;
        setLiquidityPoolToken(SUSD_SWAP_POOL, CRV_PLAIN_3_AND_SUSD);
        setSwapPoolToUnderlyingTokens(SUSD_SWAP_POOL, _susdUnderTokens);
        toggleNoRemoveLiquidityOneCoin(SUSD_SWAP_POOL);

        address[] memory _crvrenBTCwBTCUnderTokens = new address[](2);
        _crvrenBTCwBTCUnderTokens[0] = REN_BTC;
        _crvrenBTCwBTCUnderTokens[1] = WBTC;
        setLiquidityPoolToken(REN_SWAP_POOL, CRV_REN_WBTC);
        setSwapPoolToUnderlyingTokens(REN_SWAP_POOL, _crvrenBTCwBTCUnderTokens);

        address[] memory _crvrenBTCwBTCsBTCUnderTokens = new address[](3);
        _crvrenBTCwBTCsBTCUnderTokens[0] = REN_BTC;
        _crvrenBTCwBTCsBTCUnderTokens[1] = WBTC;
        _crvrenBTCwBTCsBTCUnderTokens[2] = SBTC;
        setLiquidityPoolToken(SBTC_SWAP_POOL, CRV_REN_BTC_WBTC_SBTC);
        setSwapPoolToUnderlyingTokens(SBTC_SWAP_POOL, _crvrenBTCwBTCsBTCUnderTokens);

        address[] memory _crvhBTCwBTCUnderTokens = new address[](2);
        _crvhBTCwBTCUnderTokens[0] = HBTC;
        _crvhBTCwBTCUnderTokens[1] = WBTC;
        setLiquidityPoolToken(HBTC_SWAP_POOL, HCRV);
        setSwapPoolToUnderlyingTokens(HBTC_SWAP_POOL, _crvhBTCwBTCUnderTokens);

        address[] memory _crvDAIUSDCUSDTUnderTokens = new address[](3);
        _crvDAIUSDCUSDTUnderTokens[0] = DAI;
        _crvDAIUSDCUSDTUnderTokens[1] = USDC;
        _crvDAIUSDCUSDTUnderTokens[2] = USDT;
        setLiquidityPoolToken(THREE_SWAP_POOL, THREE_CRV);
        setSwapPoolToUnderlyingTokens(THREE_SWAP_POOL, _crvDAIUSDCUSDTUnderTokens);

        address[] memory _gusdUnderlyingTokens = new address[](2);
        _gusdUnderlyingTokens[0] = GUSD;
        _gusdUnderlyingTokens[1] = THREE_CRV;
        setLiquidityPoolToken(GUSD_SWAP_POOL, GUSD_THREE_CRV);
        setSwapPoolToUnderlyingTokens(GUSD_SWAP_POOL, _gusdUnderlyingTokens);

        address[] memory _husdUnderlyingTokens = new address[](2);
        _husdUnderlyingTokens[0] = HUSD;
        _husdUnderlyingTokens[1] = THREE_CRV;
        setLiquidityPoolToken(HUSD_SWAP_POOL, HUSD_THREE_CRV);
        setSwapPoolToUnderlyingTokens(HUSD_SWAP_POOL, _husdUnderlyingTokens);

        address[] memory _usdkUnderlyingTokens = new address[](2);
        _usdkUnderlyingTokens[0] = USDK;
        _usdkUnderlyingTokens[1] = THREE_CRV;
        setLiquidityPoolToken(USDK_SWAP_POOL, USDK_THREE_CRV);
        setSwapPoolToUnderlyingTokens(USDK_SWAP_POOL, _usdkUnderlyingTokens);

        address[] memory _usdnUnderlyingTokens = new address[](2);
        _usdnUnderlyingTokens[0] = USDN;
        _usdnUnderlyingTokens[1] = THREE_CRV;
        setLiquidityPoolToken(USDN_SWAP_POOL, LINKUSD_THREE_CRV);
        setSwapPoolToUnderlyingTokens(USDK_SWAP_POOL, _usdnUnderlyingTokens);

        address[] memory _linkusdUnderlyingTokens = new address[](2);
        _linkusdUnderlyingTokens[0] = LINKUSD;
        _linkusdUnderlyingTokens[1] = THREE_CRV;
        setLiquidityPoolToken(LINKUSD_SWAP_POOL, MUSD_THREE_CRV);
        setSwapPoolToUnderlyingTokens(LINKUSD_SWAP_POOL, _linkusdUnderlyingTokens);

        address[] memory _musdUnderlyingTokens = new address[](2);
        _musdUnderlyingTokens[0] = MUSD;
        _musdUnderlyingTokens[1] = THREE_CRV;
        setLiquidityPoolToken(MUSD_SWAP_POOL, RSV_THREE_CRV);
        setSwapPoolToUnderlyingTokens(MUSD_SWAP_POOL, _musdUnderlyingTokens);

        address[] memory _rsvUnderlyingTokens = new address[](2);
        _rsvUnderlyingTokens[0] = RSV;
        _rsvUnderlyingTokens[1] = THREE_CRV;
        setLiquidityPoolToken(RSV_SWAP_POOL, TBTC_SBTC_CRV);
        setSwapPoolToUnderlyingTokens(RSV_SWAP_POOL, _rsvUnderlyingTokens);

        address[] memory _tbtcUnderlyingTokens = new address[](2);
        _tbtcUnderlyingTokens[0] = TBTC;
        _tbtcUnderlyingTokens[1] = THREE_CRV;
        setLiquidityPoolToken(TBTC_SWAP_POOL, DUSD_THREE_CRV);
        setSwapPoolToUnderlyingTokens(TBTC_SWAP_POOL, _tbtcUnderlyingTokens);

        setSwapPoolToGauges(COMPOUND_SWAP_POOL, address(0x7ca5b0a2910B33e9759DC7dDB0413949071D7575));
        setSwapPoolToGauges(USDT_SWAP_POOL, address(0xBC89cd85491d81C6AD2954E6d0362Ee29fCa8F53));
        setSwapPoolToGauges(PAX_SWAP_POOL, address(0x64E3C23bfc40722d3B649844055F1D51c1ac041d));
        setSwapPoolToGauges(Y_SWAP_POOL, address(0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1));
        setSwapPoolToGauges(BUSD_SWAP_POOL, address(0x69Fb7c45726cfE2baDeE8317005d3F94bE838840));
        setSwapPoolToGauges(SUSD_SWAP_POOL, address(0xA90996896660DEcC6E997655E065b23788857849));
        setSwapPoolToGauges(REN_SWAP_POOL, address(0xB1F2cdeC61db658F091671F5f199635aEF202CAC));
        setSwapPoolToGauges(SBTC_SWAP_POOL, address(0x705350c4BcD35c9441419DdD5d2f097d7a55410F));
        setSwapPoolToGauges(HBTC_SWAP_POOL, address(0x4c18E409Dc8619bFb6a1cB56D114C3f592E0aE79));
        setSwapPoolToGauges(THREE_SWAP_POOL, address(0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A));
        setSwapPoolToGauges(GUSD_SWAP_POOL, address(0xC5cfaDA84E902aD92DD40194f0883ad49639b023));
        setSwapPoolToGauges(HUSD_SWAP_POOL, address(0x2db0E83599a91b508Ac268a6197b8B14F5e72840));
        setSwapPoolToGauges(USDK_SWAP_POOL, address(0xC2b1DF84112619D190193E48148000e3990Bf627));
        setSwapPoolToGauges(USDN_SWAP_POOL, address(0xF98450B5602fa59CC66e1379DFfB6FDDc724CfC4));
        setSwapPoolToGauges(MUSD_SWAP_POOL, address(0x5f626c30EC1215f4EdCc9982265E8b1F411D1352));
        setSwapPoolToGauges(RSV_SWAP_POOL, address(0x4dC4A289a8E33600D8bD4cf5F6313E43a37adec7));
        setSwapPoolToGauges(TBTC_SWAP_POOL, address(0x6828bcF74279eE32f2723eC536c22c51Eed383C6));
        setSwapPoolToGauges(DUSD_SWAP_POOL, address(0xAEA6c312f4b3E04D752946d329693F7293bC2e6D));
        
        setMaxExposure(uint256(5000)); // 50%
    }

    function getPoolValue(address, address) public view override returns (uint256) {
        revert("!empty");
    }

    /**
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    // * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amounts Quantity of _underlyingToken to deposit
    */
    function getDepositSomeCodes(
        address,
        address[] memory,
        address _liquidityPool,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        uint256 N_COINS = _underlyingTokens.length;
        require(_amounts.length == N_COINS, "!_amounts.length");
        if (N_COINS == uint256(2)) {
            _codes = _getDeposit2Code(_underlyingTokens, _liquidityPool, _amounts);
        } else if (N_COINS == uint256(3)) {
            _codes = _getDeposit3Code(_underlyingTokens, _liquidityPool, _amounts);
        } else if (N_COINS == uint256(4)) {
            _codes = _getDeposit4Code(_underlyingTokens, _liquidityPool, _amounts);
        }
    }

    function getDepositAllCodes(
        address _optyPool,
        address[] memory,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        uint256 N_COINS = _underlyingTokens.length;
        uint256[] memory _amounts = new uint256[](N_COINS);
        for (uint256 i = 0; i < N_COINS; i++) {
            _amounts[i] = IERC20(_underlyingTokens[i]).balanceOf(_optyPool);
        }
        return getDepositSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _amounts);
    }

    /**
     * @dev Swaps _amount of _liquidityPoolToken for _underlyingToken
     *
     * @param _liquidityPool Address of the token that represents users' holdings in the pool
     * @param _amount Quantity of _liquidityPoolToken to swap for _underlyingToken
     */
    function getWithdrawSomeCodes(
        address,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        uint256 N_COINS = _underlyingTokens.length;
        if (N_COINS == uint256(1)) {
            _codes = _getWithdraw1Code(_underlyingTokens[0], _liquidityPool, _amount);
        } else if (N_COINS == uint256(2)) {
            _codes = _getWithdraw2Code(_liquidityPool, _amount);
        } else if (N_COINS == uint256(3)) {
            _codes = _getWithdraw3Code(_liquidityPool, _amount);
        } else if (N_COINS == uint256(4)) {
            _codes = _getWithdraw4Code(_liquidityPool, _amount);
        }
    }

    function getWithdrawAllCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _amount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _amount);
    }

    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return swapPoolToLiquidityPoolToken[_liquidityPool];
    }

    function getUnderlyingTokens(address _liquidityPool, address) public view override returns (address[] memory _underlyingTokens) {
        _underlyingTokens = swapPoolToUnderlyingTokens[_liquidityPool];
    }

    /**
     * @dev Calls the appropriate deploy function depending on N_COINS
     *
     * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
     *      the user's balance in _liquidityPoolToken
     */
    function getAllAmountInToken(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        uint256 _liquidityPoolTokenAmount = getLiquidityPoolTokenBalance(_optyPool, _underlyingToken, _liquidityPool);
        return getSomeAmountInToken(_underlyingToken, _liquidityPool, _liquidityPoolTokenAmount);
    }

    function getLiquidityPoolTokenBalance(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IERC20(getLiquidityPoolToken(_underlyingToken, _liquidityPool)).balanceOf(_optyPool);
    }

    /**
     * @dev Calls the appropriate deploy function depending on N_COINS
     *
     * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
     *      the user's balance in _liquidityPoolToken
     */
    function getSomeAmountInToken(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        int128 tokenIndex = 0;
        for (uint8 i = 0; i < _underlyingTokens.length; i++) {
            if (_underlyingTokens[i] == _underlyingToken) {
                tokenIndex = i;
            }
        }
        if (_liquidityPoolTokenAmount > 0) {
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
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("not-implemented");
    }

    function calculateRedeemableLPTokenAmount(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyPool, _underlyingToken, _liquidityPool);
        uint256 _balanceInToken = getAllAmountInToken(_optyPool, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }

    function isRedeemableAmountSufficient(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyPool, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    function getRewardToken(address _liquidityPool) public view override returns (address) {
        if (swapPoolToGauges[_liquidityPool] != address(0)) {
            return rewardToken;
        }
        return address(0);
    }

    function getUnclaimedRewardTokenAmount(address, address _liquidityPool) public view override returns (uint256) {
        if (swapPoolToGauges[_liquidityPool] != address(0)) {
            // TODO : get the amount of unclaimed CRV tokens
        }
        return uint256(0);
    }

    function getClaimRewardTokenCode(address, address _liquidityPool) public view override returns (bytes[] memory _codes) {
        if (swapPoolToGauges[_liquidityPool] != address(0)) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                getMinter(swapPoolToGauges[_liquidityPool]),
                abi.encodeWithSignature("mint(address)", swapPoolToGauges[_liquidityPool])
            );
        }
    }

    function getHarvestSomeCodes(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _rewardTokenAmount
    ) public view override returns (bytes[] memory _codes) {
        return gathererContract.getHarvestCodes(_optyPool, getRewardToken(_liquidityPool), _underlyingToken, _rewardTokenAmount);
    }

    function getHarvestAllCodes(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _rewardTokenAmount = IERC20(getRewardToken(_liquidityPool)).balanceOf(_optyPool);
        return getHarvestSomeCodes(_optyPool, _underlyingToken, _liquidityPool, _rewardTokenAmount);
    }

    function canStake(address _liquidityPool) public view override returns (bool) {
        if (swapPoolToGauges[_liquidityPool] != address(0)) {
            return true;
        }
        return false;
    }

    function getStakeSomeCodes(address _liquidityPool, uint256 _stakeAmount) public view override returns (bytes[] memory _codes) {
        address _gauge = swapPoolToGauges[_liquidityPool];
        address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
        _codes = new bytes[](3);
        _codes[0] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _gauge, uint256(0)));
        _codes[1] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _gauge, _stakeAmount));
        _codes[2] = abi.encode(_gauge, abi.encodeWithSignature("deposit(uint256)", _stakeAmount));
    }

    function getStakeAllCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _stakeAmount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPool);
        return getStakeSomeCodes(_liquidityPool, _stakeAmount);
    }

    function getUnstakeSomeCodes(address _liquidityPool, uint256 _unstakeAmount) public view override returns (bytes[] memory _codes) {
        address _gauge = swapPoolToGauges[_liquidityPool];
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_gauge, abi.encodeWithSignature("withdraw(uint256)", _unstakeAmount));
    }

    function getUnstakeAllCodes(address _optyPool, address _liquidityPool) public view override returns (bytes[] memory _codes) {
        uint256 _unstakeAmount = getLiquidityPoolTokenBalanceStake(_optyPool, _liquidityPool);
        return getUnstakeSomeCodes(_liquidityPool, _unstakeAmount);
    }

    /**
     * @dev Calls the appropriate deploy function depending on N_COINS
     *
     * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
     *      the user's balance in _liquidityPoolToken in staking pool(gauge)
     */
    function getAllAmountInTokenStake(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        int128 tokenIndex = 0;
        for (uint8 i = 0; i < _underlyingTokens.length; i++) {
            if (_underlyingTokens[i] == _underlyingToken) {
                tokenIndex = i;
            }
        }
        uint256 _liquidityPoolTokenAmount = getLiquidityPoolTokenBalanceStake(_optyPool, _liquidityPool);
        uint256 _b = 0;
        if (_liquidityPoolTokenAmount > 0) {
            _b = ICurveDeposit(_liquidityPool).calc_withdraw_one_coin(_liquidityPoolTokenAmount, tokenIndex);
        }
        _b = _b.add(
            gathererContract.rewardBalanceInUnderlyingTokens(
                getRewardToken(_liquidityPool),
                _underlyingToken,
                getUnclaimedRewardTokenAmount(_optyPool, _liquidityPool)
            )
        );
        return _b;
    }

    function getLiquidityPoolTokenBalanceStake(address _optyPool, address _liquidityPool) public view override returns (uint256) {
        return ICurveGauge(swapPoolToGauges[_liquidityPool]).balanceOf(_optyPool);
    }

    function calculateRedeemableLPTokenAmountStake(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        uint256 _stakedLiquidityPoolTokenBalance = getLiquidityPoolTokenBalanceStake(_optyPool, _liquidityPool);
        uint256 _balanceInTokenStaked = getAllAmountInTokenStake(_optyPool, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_stakedLiquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInTokenStaked).add(1);
    }

    function isRedeemableAmountSufficientStake(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInTokenStaked = getAllAmountInTokenStake(_optyPool, _underlyingToken, _liquidityPool);
        return _balanceInTokenStaked >= _redeemAmount;
    }

    function getUnstakeAndWithdrawSomeCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bytes[] memory _codes) {
        if(_redeemAmount > 0) {
            _codes = new bytes[](4);
            _codes[0] = getUnstakeSomeCodes(_liquidityPool, _redeemAmount)[0];
            bytes[] memory _withdrawCodes = getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _redeemAmount);
            _codes[1] = _withdrawCodes[0];
            _codes[2] = _withdrawCodes[1];
            _codes[3] = _withdrawCodes[2];
        }
    }

    function getUnstakeAndWithdrawAllCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
            uint256 _redeemAmount = getLiquidityPoolTokenBalanceStake(_optyPool, _liquidityPool);
            return getUnstakeAndWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    function setRewardToken(address _rewardToken) public onlyOperator {
        rewardToken = _rewardToken;
    }

    function getMinter(address _gauge) public view returns (address) {
        return ICurveGauge(_gauge).minter();
    }

    function setLiquidityPoolToken(address _swapPool, address _liquidityPoolToken) public onlyOperator {
        swapPoolToLiquidityPoolToken[_swapPool] = _liquidityPoolToken;
    }

    function setSwapPoolToUnderlyingTokens(address _lendingPool, address[] memory _tokens) public onlyOperator {
        swapPoolToUnderlyingTokens[_lendingPool] = _tokens;
    }

    function setSwapPoolToGauges(address _pool, address _gauge) public onlyOperator {
        swapPoolToGauges[_pool] = _gauge;
    }

    function toggleNoRemoveLiquidityOneCoin(address _pool) public onlyOperator {
        if (!noRemoveLiquidityOneCoin[_pool]) {
            noRemoveLiquidityOneCoin[_pool] = true;
        } else {
            noRemoveLiquidityOneCoin[_pool] = false;
        }
    }

    /**
     * @dev Deploy function for a pool with 2 tokens
     *
     * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
     * @param _amounts Quantity of _underlyingToken to deposit
     */
    function _getDeposit2Code(
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) internal pure returns (bytes[] memory _codes) {
        uint256[2] memory _amountsIn;
        uint8 _codeLength = 1;
        bool _IsAmount = false;
        // calculator for lines of code
        for (uint8 i = 0; i < 2; i++) {
            _amountsIn[i] = _amounts[i];
            if (_amountsIn[i] > 0) {
                if (_underlyingTokens[i] == HBTC) {
                    _codeLength++;
                } else {
                    _codeLength += 2;
                }
            }
        }
        _codes = new bytes[](_codeLength);
        uint8 _j = 0;
        for (uint8 i = 0; i < 2; i++) {
            if (_amountsIn[i] > 0) {
                _IsAmount = true;
                if (_underlyingTokens[i] == HBTC) {
                    _codes[_j++] = abi.encode(
                        _underlyingTokens[i],
                        abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amountsIn[i])
                    );
                } else {
                    _codes[_j++] = abi.encode(
                        _underlyingTokens[i],
                        abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
                    );
                    _codes[_j++] = abi.encode(
                        _underlyingTokens[i],
                        abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amountsIn[i])
                    );
                }
            }
        }
        if(_IsAmount) {
            _codes[_j] = abi.encode(_liquidityPool, abi.encodeWithSignature("add_liquidity(uint256[2],uint256)", _amountsIn, uint256(0)));
        }
    }

    /**
     * @dev Deploy function for a pool with 3 tokens
     *
     * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
     * @param _amounts Quantity of _underlyingToken to deposit
     */
    function _getDeposit3Code(
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) internal pure returns (bytes[] memory _codes) {
        uint256[3] memory _amountsIn;
        uint8 _codeLength = 1;
        bool _IsAmount = false;
        // calculator for lines of code
        for (uint8 i = 0; i < 3; i++) {
            _amountsIn[i] = _amounts[i];
            if (_amountsIn[i] > 0) {
                if (_underlyingTokens[i] == HBTC) {
                    _codeLength++;
                } else {
                    _codeLength += 2;
                }
            }
        }
        _codes = new bytes[](_codeLength);
        uint8 _j = 0;
        for (uint8 i = 0; i < 3; i++) {
            if (_amountsIn[i] > 0) {
                _IsAmount = true;
                if (_underlyingTokens[i] == HBTC) {
                    _codes[_j++] = abi.encode(
                        _underlyingTokens[i],
                        abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amountsIn[i])
                    );
                } else {
                    _codes[_j++] = abi.encode(
                        _underlyingTokens[i],
                        abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
                    );
                    _codes[_j++] = abi.encode(
                        _underlyingTokens[i],
                        abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amountsIn[i])
                    );
                }
            }
        }
        if (_IsAmount) {
            _codes[_j] = abi.encode(_liquidityPool, abi.encodeWithSignature("add_liquidity(uint256[3],uint256)", _amountsIn, uint256(0)));
        }
    }

    /**
     * @dev Deploy function for a pool with 4 tokens
     *
     * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
     * @param _amounts Quantity of _underlyingToken to deposit
     */
    function _getDeposit4Code(
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) internal pure returns (bytes[] memory _codes) {
        uint256[4] memory _amountsIn;
        uint8 _codeLength = 1;
        bool _IsAmount = false;
        // calculator for lines of code
        for (uint8 i = 0; i < 4; i++) {
            _amountsIn[i] = _amounts[i];
            if (_amountsIn[i] > 0) {
                if (_underlyingTokens[i] == HBTC) {
                    _codeLength++;
                } else {
                    _codeLength += 2;
                }
            }
        }
        _codes = new bytes[](_codeLength);
        uint8 _j = 0;
        for (uint8 i = 0; i < 4; i++) {
            if (_amountsIn[i] > 0) {
                _IsAmount = true;
                if (_underlyingTokens[i] == HBTC) {
                    _codes[_j++] = abi.encode(
                        _underlyingTokens[i],
                        abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amountsIn[i])
                    );
                } else {
                    _codes[_j++] = abi.encode(
                        _underlyingTokens[i],
                        abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
                    );
                    _codes[_j++] = abi.encode(
                        _underlyingTokens[i],
                        abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amountsIn[i])
                    );
                }
            }
        }
        if(_IsAmount) {
            _codes[_j] = abi.encode(_liquidityPool, abi.encodeWithSignature("add_liquidity(uint256[4],uint256)", _amountsIn, uint256(0)));
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
        uint256 _amount
    ) internal view returns (bytes[] memory _codes) {
        if (_amount > 0) {
            address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
            int128 i = 0;
            for (uint8 j = 0; j < _underlyingTokens.length; j++) {
                if (_underlyingTokens[j] == _underlyingToken) {
                    i = j;
                }
            }
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            if (!noRemoveLiquidityOneCoin[_liquidityPool]) {
                _codes[0] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0)));
                _codes[1] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount));
                _codes[2] = abi.encode(
                    _liquidityPool,
                    abi.encodeWithSignature("remove_liquidity_one_coin(uint256,int128,uint256)", _amount, i, uint256(0))
                );
            } else {
                // Note : swap pools of compound,usdt,pax,y,susd and busd does not have remove_liquidity_one_coin function
                revert("!remove_one_coin");
            }
        }
    }

    /**
     * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
     *
     * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
     * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
     */
    function _getWithdraw2Code(address _liquidityPool, uint256 _amount) internal view returns (bytes[] memory _codes) {
        if(_amount > 0) {
            uint256[2] memory _minAmountOut = [uint256(0), uint256(0)];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0)));
            _codes[1] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount));
            _codes[2] = abi.encode(_liquidityPool, abi.encodeWithSignature("remove_liquidity(uint256,uint256[2])", _amount, _minAmountOut));
        }
    }

    /**
     * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
     *
     * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
     * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
     */
    function _getWithdraw3Code(address _liquidityPool, uint256 _amount) internal view returns (bytes[] memory _codes) {
        if(_amount > 0) {
            uint256[3] memory _minAmountOut = [uint256(0), uint256(0), uint256(0)];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0)));
            _codes[1] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount));
            _codes[2] = abi.encode(_liquidityPool, abi.encodeWithSignature("remove_liquidity(uint256,uint256[3])", _amount, _minAmountOut));
        }
    }

    /**
     * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
     *
     * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
     * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
     */
    function _getWithdraw4Code(address _liquidityPool, uint256 _amount) internal view returns (bytes[] memory _codes) {
        if(_amount > 0) {
            uint256[4] memory _minAmountOut = [uint256(0), uint256(0), uint256(0), uint256(0)];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0)));
            _codes[1] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount));
            _codes[2] = abi.encode(_liquidityPool, abi.encodeWithSignature("remove_liquidity(uint256,uint256[4])", _amount, _minAmountOut));
        }
    }

    function _getUnderlyingTokens(address _liquidityPool) internal view returns (address[] memory _underlyingTokens) {
        _underlyingTokens = swapPoolToUnderlyingTokens[_liquidityPool];
    }

    function setGatherer(address _gatherer) public onlyOperator {
        gathererContract = Gatherer(_gatherer);
    }
    
    function setMaxExposure(uint256 _maxExposure) public onlyOperator {
        maxExposure = _maxExposure;
    }
}
