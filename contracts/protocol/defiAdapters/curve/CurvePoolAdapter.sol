// solhint-disable no-unused-vars
// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { IAdapter } from "../../../interfaces/opty/IAdapter.sol";
import { ICurveDeposit } from "../../../interfaces/curve/ICurveDeposit.sol";
import { ICurveSwap } from "../../../interfaces/curve/ICurveSwap.sol";
import { ICurveGauge } from "../../../interfaces/curve/ICurveGauge.sol";
import { ITokenMinter } from "../../../interfaces/curve/ITokenMinter.sol";
import { SafeERC20, IERC20, SafeMath } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { Modifiers } from "../../configuration/Modifiers.sol";
import { HarvestCodeProvider } from "../../configuration/HarvestCodeProvider.sol";
import { PriceOracle } from "../../configuration/PriceOracle.sol";

/**
 * @dev Abstraction layer to Curve's deposit pools
 */

contract CurvePoolAdapter is IAdapter, Modifiers {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    mapping(address => address[]) public liquidityPoolToUnderlyingTokens;
    mapping(address => address) public liquidityPoolToSwap;
    mapping(address => address) public liquidityPoolToGauges;
    mapping(address => uint256[2]) public maxDeposit2Amount;
    mapping(address => uint256[3]) public maxDeposit3Amount;
    mapping(address => uint256[4]) public maxDeposit4Amount;
    mapping(address => uint256) public maxDepositPoolPct; // basis points

    // underlying token
    address public constant DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant USDT = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    address public constant PAX = address(0x8E870D67F660D95d5be530380D0eC0bd388289E1);
    address public constant TUSD = address(0x0000000000085d4780B73119b644AE5ecd22b376);
    address public constant BUSD = address(0x4Fabb145d64652a948d72533023f6E7A623C7C53);
    address public constant SUSD = address(0x57Ab1ec28D129707052df4dF418D58a2D46d5f51);
    address public constant GUSD = address(0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd);
    address public constant HUSD = address(0xdF574c24545E5FfEcb9a659c229253D4111d87e1);
    address public constant USDK = address(0x1c48f86ae57291F7686349F12601910BD8D470bb);
    address public constant USDN = address(0x674C6Ad92Fd080e4004b2312b45f796a192D27a0);
    address public constant LINKUSD = address(0x0E2EC54fC0B509F445631Bf4b91AB8168230C752);
    address public constant MUSD = address(0xe2f2a5C287993345a840Db3B0845fbC70f5935a5);
    address public constant RSV = address(0x196f4727526eA7FB1e17b2071B3d8eAA38486988);
    address public constant TBTC = address(0x8dAEBADE922dF735c38C80C7eBD708Af50815fAa);
    address public constant DUSD = address(0x5BC25f649fc4e26069dDF4cF4010F9f706c23831);
    address public constant HBTC = address(0x0316EB71485b0Ab14103307bf65a021042c6d380);

    // deposit pool
    address public constant COMPOUND_DEPOSIT_POOL = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06);
    address public constant USDT_DEPOSIT_POOL = address(0xac795D2c97e60DF6a99ff1c814727302fD747a80);
    address public constant PAX_DEPOSIT_POOL = address(0xA50cCc70b6a011CffDdf45057E39679379187287);
    address public constant Y_DEPOSIT_POOL = address(0xbBC81d23Ea2c3ec7e56D39296F0cbB648873a5d3);
    address public constant BUSD_DEPOSIT_POOL = address(0xb6c057591E073249F2D9D88Ba59a46CFC9B59EdB);
    address public constant SUSD_DEPOSIT_POOL = address(0xFCBa3E75865d2d561BE8D220616520c171F12851);
    address public constant GUSD_DEPOSIT_POOL = address(0x0aE274c98c0415C0651AF8cF52b010136E4a0082);
    address public constant HUSD_DEPOSIT_POOL = address(0x0a53FaDa2d943057C47A301D25a4D9b3B8e01e8E);
    address public constant USDK_DEPOSIT_POOL = address(0x6600e98b71dabfD4A8Cac03b302B0189Adb86Afb);
    address public constant USDN_DEPOSIT_POOL = address(0x35796DAc54f144DFBAD1441Ec7C32313A7c29F39);
    address public constant LINKUSD_DEPOSIT_POOL = address(0xF6bDc2619FFDA72c537Cd9605e0A274Dc48cB1C9);
    address public constant MUSD_DEPOSIT_POOL = address(0x78CF256256C8089d68Cde634Cf7cDEFb39286470);
    address public constant RSV_DEPOSIT_POOL = address(0x459eAA680b47D27c8561708C96c949e0018dF5d9);
    address public constant TBTC_DEPOSIT_POOL = address(0xaa82ca713D94bBA7A89CEAB55314F9EfFEdDc78c);
    address public constant DUSD_DEPOSIT_POOL = address(0x61E10659fe3aa93d036d099405224E4Ac24996d0);

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

    // gauges
    address public constant COMPOUND_GAUGE = address(0x7ca5b0a2910B33e9759DC7dDB0413949071D7575);
    address public constant USDT_GAUGE = address(0xBC89cd85491d81C6AD2954E6d0362Ee29fCa8F53);
    address public constant PAX_GAUGE = address(0x64E3C23bfc40722d3B649844055F1D51c1ac041d);
    address public constant Y_GAUGE = address(0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1);
    address public constant BUSD_GAUGE = address(0x69Fb7c45726cfE2baDeE8317005d3F94bE838840);
    address public constant SUSD_GAUGE = address(0xA90996896660DEcC6E997655E065b23788857849);
    address public constant GUSD_GAUGE = address(0xC5cfaDA84E902aD92DD40194f0883ad49639b023);
    address public constant HUSD_GAUGE = address(0x2db0E83599a91b508Ac268a6197b8B14F5e72840);
    address public constant USDK_GAUGE = address(0xC2b1DF84112619D190193E48148000e3990Bf627);
    address public constant USDN_GAUGE = address(0xF98450B5602fa59CC66e1379DFfB6FDDc724CfC4);
    address public constant MUSD_GAUGE = address(0x5f626c30EC1215f4EdCc9982265E8b1F411D1352);
    address public constant RSV_GAUGE = address(0x4dC4A289a8E33600D8bD4cf5F6313E43a37adec7);
    address public constant TBTC_GAUGE = address(0x6828bcF74279eE32f2723eC536c22c51Eed383C6);
    address public constant DUSD_GAUGE = address(0xAEA6c312f4b3E04D752946d329693F7293bC2e6D);

    HarvestCodeProvider public harvestCodeProviderContract;
    PriceOracle public oracleContract;
    uint256 public maxDepositPoolPctDefault; // basis points
    uint256[4] public maxDepositAmountDefault;

    /**
     * @dev map coins and tokens to curve deposit pool
     */
    constructor(
        address _registry,
        address _harvestCodeProvider,
        address _oracle
    ) public Modifiers(_registry) {
        setOracle(_oracle);
        setHarvestCodeProvider(_harvestCodeProvider);
        // deposit pool
        address[] memory _compoundUnderlyingTokens = new address[](2);
        _compoundUnderlyingTokens[0] = DAI;
        _compoundUnderlyingTokens[1] = USDC;
        setLiquidityPoolToUnderlyingTokens(COMPOUND_DEPOSIT_POOL, _compoundUnderlyingTokens);
        setLiquidityPoolToSwap(COMPOUND_DEPOSIT_POOL, COMPOUND_SWAP_POOL);

        address[] memory _usdtUnderlyingTokens = new address[](3);
        _usdtUnderlyingTokens[0] = DAI;
        _usdtUnderlyingTokens[1] = USDC;
        _usdtUnderlyingTokens[2] = USDT;
        setLiquidityPoolToUnderlyingTokens(USDT_DEPOSIT_POOL, _usdtUnderlyingTokens);
        setLiquidityPoolToSwap(USDT_DEPOSIT_POOL, USDT_SWAP_POOL);

        address[] memory _paxUnderlyingTokens = new address[](4);
        _paxUnderlyingTokens[0] = DAI;
        _paxUnderlyingTokens[1] = USDC;
        _paxUnderlyingTokens[2] = USDT;
        _paxUnderlyingTokens[3] = PAX;
        setLiquidityPoolToUnderlyingTokens(PAX_DEPOSIT_POOL, _paxUnderlyingTokens);
        setLiquidityPoolToSwap(PAX_DEPOSIT_POOL, PAX_SWAP_POOL);

        address[] memory _yUnderlyingTokens = new address[](4);
        _yUnderlyingTokens[0] = DAI;
        _yUnderlyingTokens[1] = USDC;
        _yUnderlyingTokens[2] = USDT;
        _yUnderlyingTokens[3] = TUSD;
        setLiquidityPoolToUnderlyingTokens(Y_DEPOSIT_POOL, _yUnderlyingTokens);
        setLiquidityPoolToSwap(Y_DEPOSIT_POOL, Y_SWAP_POOL);

        address[] memory _busdUnderlyingTokens = new address[](4);
        _busdUnderlyingTokens[0] = DAI;
        _busdUnderlyingTokens[1] = USDC;
        _busdUnderlyingTokens[2] = USDT;
        _busdUnderlyingTokens[3] = BUSD;
        setLiquidityPoolToUnderlyingTokens(BUSD_DEPOSIT_POOL, _busdUnderlyingTokens);
        setLiquidityPoolToSwap(BUSD_DEPOSIT_POOL, BUSD_SWAP_POOL);

        address[] memory _susdUnderlyingTokens = new address[](4);
        _susdUnderlyingTokens[0] = DAI;
        _susdUnderlyingTokens[1] = USDC;
        _susdUnderlyingTokens[2] = USDT;
        _susdUnderlyingTokens[3] = SUSD;
        setLiquidityPoolToUnderlyingTokens(SUSD_DEPOSIT_POOL, _susdUnderlyingTokens);
        setLiquidityPoolToSwap(SUSD_DEPOSIT_POOL, SUSD_SWAP_POOL);

        address[] memory _gusdUnderlyingTokens = new address[](4);
        _gusdUnderlyingTokens[0] = GUSD;
        _gusdUnderlyingTokens[1] = DAI;
        _gusdUnderlyingTokens[2] = USDC;
        _gusdUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(GUSD_DEPOSIT_POOL, _gusdUnderlyingTokens); // GUSD,DAI,USDC,USDT
        setLiquidityPoolToSwap(GUSD_DEPOSIT_POOL, GUSD_SWAP_POOL);

        address[] memory _husdUnderlyingTokens = new address[](4);
        _gusdUnderlyingTokens[0] = HUSD;
        _gusdUnderlyingTokens[1] = DAI;
        _gusdUnderlyingTokens[2] = USDC;
        _gusdUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(HUSD_DEPOSIT_POOL, _husdUnderlyingTokens); // HUSD, DAI,USDC,USDT
        setLiquidityPoolToSwap(HUSD_DEPOSIT_POOL, HUSD_SWAP_POOL);

        address[] memory _usdkUnderlyingTokens = new address[](4);
        _usdkUnderlyingTokens[0] = USDK;
        _usdkUnderlyingTokens[1] = DAI;
        _usdkUnderlyingTokens[2] = USDC;
        _usdkUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(USDK_DEPOSIT_POOL, _usdkUnderlyingTokens); // USDK, DAI.USDC,USDT
        setLiquidityPoolToSwap(USDK_DEPOSIT_POOL, USDK_SWAP_POOL);

        address[] memory _usdnUnderlyingTokens = new address[](4);
        _usdnUnderlyingTokens[0] = USDN;
        _usdnUnderlyingTokens[1] = DAI;
        _usdnUnderlyingTokens[2] = USDC;
        _usdnUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(USDN_DEPOSIT_POOL, _usdnUnderlyingTokens); // USDN, DAI, USDC, USDT
        setLiquidityPoolToSwap(USDN_DEPOSIT_POOL, USDN_SWAP_POOL);

        address[] memory _linkusdUnderlyingTokens = new address[](4);
        _linkusdUnderlyingTokens[0] = LINKUSD;
        _linkusdUnderlyingTokens[1] = DAI;
        _linkusdUnderlyingTokens[2] = USDC;
        _linkusdUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(LINKUSD_DEPOSIT_POOL, _linkusdUnderlyingTokens); // LINKUSD, DAI, USDC, USDT
        setLiquidityPoolToSwap(LINKUSD_DEPOSIT_POOL, LINKUSD_SWAP_POOL);

        address[] memory _musdUnderlyingTokens = new address[](4);
        _musdUnderlyingTokens[0] = MUSD;
        _musdUnderlyingTokens[1] = DAI;
        _musdUnderlyingTokens[2] = USDC;
        _musdUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(MUSD_DEPOSIT_POOL, _musdUnderlyingTokens); // MUSD, DAI, USDC, USDT
        setLiquidityPoolToSwap(MUSD_DEPOSIT_POOL, MUSD_SWAP_POOL);

        address[] memory _rsvUnderlyingTokens = new address[](4);
        _rsvUnderlyingTokens[0] = RSV;
        _rsvUnderlyingTokens[1] = DAI;
        _rsvUnderlyingTokens[2] = USDC;
        _rsvUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(RSV_DEPOSIT_POOL, _rsvUnderlyingTokens); // RSV, DAI, USDC, USDT
        setLiquidityPoolToSwap(RSV_DEPOSIT_POOL, RSV_SWAP_POOL);

        address[] memory _tbtcUnderlyingTokens = new address[](4);
        _tbtcUnderlyingTokens[0] = TBTC;
        _tbtcUnderlyingTokens[1] = DAI;
        _tbtcUnderlyingTokens[2] = USDC;
        _tbtcUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(TBTC_DEPOSIT_POOL, _tbtcUnderlyingTokens); // TBTC, DAI, USDC, USDT
        setLiquidityPoolToSwap(TBTC_DEPOSIT_POOL, TBTC_SWAP_POOL);

        address[] memory _dusdUnderlyingTokens = new address[](4);
        _dusdUnderlyingTokens[0] = DUSD;
        _dusdUnderlyingTokens[1] = DAI;
        _dusdUnderlyingTokens[2] = USDC;
        _dusdUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(DUSD_DEPOSIT_POOL, _dusdUnderlyingTokens); // DUSD, DAI, USDC, USDT
        setLiquidityPoolToSwap(DUSD_DEPOSIT_POOL, DUSD_SWAP_POOL);

        // set liquidity pool to gauges
        setLiquiidtyPoolToGauges(COMPOUND_DEPOSIT_POOL, COMPOUND_GAUGE);
        setLiquiidtyPoolToGauges(USDT_DEPOSIT_POOL, USDT_GAUGE);
        setLiquiidtyPoolToGauges(PAX_DEPOSIT_POOL, PAX_GAUGE);
        setLiquiidtyPoolToGauges(Y_DEPOSIT_POOL, Y_GAUGE);
        setLiquiidtyPoolToGauges(BUSD_DEPOSIT_POOL, BUSD_GAUGE);
        setLiquiidtyPoolToGauges(SUSD_DEPOSIT_POOL, SUSD_GAUGE);
        setLiquiidtyPoolToGauges(GUSD_DEPOSIT_POOL, GUSD_GAUGE);
        setLiquiidtyPoolToGauges(HUSD_DEPOSIT_POOL, HUSD_GAUGE);
        setLiquiidtyPoolToGauges(USDK_DEPOSIT_POOL, USDK_GAUGE);
        setLiquiidtyPoolToGauges(USDN_DEPOSIT_POOL, USDN_GAUGE);
        setLiquiidtyPoolToGauges(MUSD_DEPOSIT_POOL, MUSD_GAUGE);
        setLiquiidtyPoolToGauges(RSV_DEPOSIT_POOL, RSV_GAUGE);
        setLiquiidtyPoolToGauges(TBTC_DEPOSIT_POOL, TBTC_GAUGE);
        setLiquiidtyPoolToGauges(DUSD_DEPOSIT_POOL, DUSD_GAUGE);

        setMaxDepositPoolPctDefault(uint256(5000)); // 50%
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
        address payable,
        address[] memory,
        address _liquidityPool,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        uint256 nCoins = _underlyingTokens.length;
        require(_amounts.length == nCoins, "!_amounts.length");
        if (nCoins == uint256(2)) {
            _codes = _getDeposit2Code(_underlyingTokens, _liquidityPool, _amounts);
        } else if (nCoins == uint256(3)) {
            _codes = _getDeposit3Code(_underlyingTokens, _liquidityPool, _amounts);
        } else if (nCoins == uint256(4)) {
            _codes = _getDeposit4Code(_underlyingTokens, _liquidityPool, _amounts);
        }
    }

    function getDepositAllCodes(
        address payable _optyVault,
        address[] memory,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        uint256 nCoins = _underlyingTokens.length;
        uint256[] memory _amounts = new uint256[](nCoins);
        for (uint256 i = 0; i < nCoins; i++) {
            _amounts[i] = IERC20(_underlyingTokens[i]).balanceOf(_optyVault);
        }
        return getDepositSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _amounts);
    }

    function getBorrowAllCodes(
        address payable,
        address[] memory,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getRepayAndWithdrawAllCodes(
        address payable,
        address[] memory,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @dev Swaps _amount of _liquidityPoolToken for _underlyingToken
     *
     * @param _liquidityPool Address of the token that represents users' holdings in the pool
     * @param _amount Quantity of _liquidityPoolToken to swap for _underlyingToken
     */
    function getWithdrawSomeCodes(
        address payable,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        uint256 nCoins = _underlyingTokens.length;
        if (nCoins == uint256(1)) {
            _codes = _getWithdraw1Code(_underlyingTokens[0], _liquidityPool, _amount);
        } else if (nCoins == uint256(2)) {
            _codes = _getWithdraw2Code(_liquidityPool, _amount);
        } else if (nCoins == uint256(3)) {
            _codes = _getWithdraw3Code(_liquidityPool, _amount);
        } else if (nCoins == uint256(4)) {
            _codes = _getWithdraw4Code(_liquidityPool, _amount);
        }
    }

    function getWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _amount = getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _amount);
    }

    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return ICurveDeposit(_liquidityPool).token();
    }

    function getUnderlyingTokens(address _liquidityPool, address)
        public
        view
        override
        returns (address[] memory _underlyingTokens)
    {
        _underlyingTokens = liquidityPoolToUnderlyingTokens[_liquidityPool];
    }

    /**
     * @dev Calls the appropriate deploy function depending on N_COINS
     *
     * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
     *      the user's balance in _liquidityPoolToken
     */
    function getAllAmountInToken(
        address payable _holder,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        uint256 _liquidityPoolTokenAmount = getLiquidityPoolTokenBalance(_holder, _underlyingToken, _liquidityPool);
        return getSomeAmountInToken(_underlyingToken, _liquidityPool, _liquidityPoolTokenAmount);
    }

    function getLiquidityPoolTokenBalance(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IERC20(getLiquidityPoolToken(_underlyingToken, _liquidityPool)).balanceOf(_optyVault);
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

    function getSomeAmountInTokenBorrow(
        address payable,
        address,
        address,
        uint256,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function getAllAmountInTokenBorrow(
        address payable,
        address,
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
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
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyVault, _underlyingToken, _liquidityPool);
        uint256 _balanceInToken = getAllAmountInToken(_optyVault, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }

    function isRedeemableAmountSufficient(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyVault, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    function getRewardToken(address _liquidityPool) public view override returns (address) {
        if (liquidityPoolToGauges[_liquidityPool] != address(0)) {
            return ITokenMinter(getMinter(liquidityPoolToGauges[_liquidityPool])).token();
        }
        return address(0);
    }

    function getUnclaimedRewardTokenAmount(address payable, address _liquidityPool)
        public
        view
        override
        returns (uint256)
    {
        if (liquidityPoolToGauges[_liquidityPool] != address(0)) {
            // TODO : get the amount of unclaimed CRV tokens
            return uint256(1000000000000000000);
        }
        return uint256(0);
    }

    function getClaimRewardTokenCode(address payable, address _liquidityPool)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        if (liquidityPoolToGauges[_liquidityPool] != address(0)) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                getMinter(liquidityPoolToGauges[_liquidityPool]),
                abi.encodeWithSignature("mint(address)", liquidityPoolToGauges[_liquidityPool])
            );
        }
    }

    function getHarvestSomeCodes(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _rewardTokenAmount
    ) public view override returns (bytes[] memory _codes) {
        return
            harvestCodeProviderContract.getHarvestCodes(
                _optyVault,
                getRewardToken(_liquidityPool),
                _underlyingToken,
                _rewardTokenAmount
            );
    }

    function getHarvestAllCodes(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _rewardTokenAmount = IERC20(getRewardToken(_liquidityPool)).balanceOf(_optyVault);
        return getHarvestSomeCodes(_optyVault, _underlyingToken, _liquidityPool, _rewardTokenAmount);
    }

    function canStake(address _liquidityPool) public view override returns (bool) {
        if (liquidityPoolToGauges[_liquidityPool] != address(0)) {
            return true;
        }
        return false;
    }

    function getStakeSomeCodes(address _liquidityPool, uint256 _stakeAmount)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        if (_stakeAmount > 0) {
            address _gauge = liquidityPoolToGauges[_liquidityPool];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _gauge, uint256(0))
            );
            _codes[1] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _gauge, _stakeAmount)
            );
            _codes[2] = abi.encode(_gauge, abi.encodeWithSignature("deposit(uint256)", _stakeAmount));
        }
    }

    function getStakeAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _stakeAmount = getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPool);
        return getStakeSomeCodes(_liquidityPool, _stakeAmount);
    }

    function getUnstakeSomeCodes(address _liquidityPool, uint256 _unstakeAmount)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        if (_unstakeAmount > 0) {
            address _gauge = liquidityPoolToGauges[_liquidityPool];
            _codes = new bytes[](1);
            _codes[0] = abi.encode(_gauge, abi.encodeWithSignature("withdraw(uint256)", _unstakeAmount));
        }
    }

    function getUnstakeAllCodes(address payable _optyVault, address _liquidityPool)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        uint256 _unstakeAmount = getLiquidityPoolTokenBalanceStake(_optyVault, _liquidityPool);
        return getUnstakeSomeCodes(_liquidityPool, _unstakeAmount);
    }

    /**
     * @dev Calls the appropriate deploy function depending on N_COINS
     *
     * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
     *      the user's balance in _liquidityPoolToken in staking pool(gauge)
     */
    function getAllAmountInTokenStake(
        address payable _optyVault,
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
        address _gauge = liquidityPoolToGauges[_liquidityPool];
        uint256 _liquidityPoolTokenAmount = ICurveGauge(_gauge).balanceOf(_optyVault);
        uint256 _b = 0;
        if (_liquidityPoolTokenAmount > 0) {
            _b = ICurveDeposit(_liquidityPool).calc_withdraw_one_coin(_liquidityPoolTokenAmount, tokenIndex);
        }
        _b = _b.add(
            harvestCodeProviderContract.rewardBalanceInUnderlyingTokens(
                getRewardToken(_liquidityPool),
                _underlyingToken,
                getUnclaimedRewardTokenAmount(_optyVault, _liquidityPool)
            )
        );
        return _b;
    }

    function getLiquidityPoolTokenBalanceStake(address payable _optyVault, address _liquidityPool)
        public
        view
        override
        returns (uint256)
    {
        return ICurveGauge(liquidityPoolToGauges[_liquidityPool]).balanceOf(_optyVault);
    }

    function calculateRedeemableLPTokenAmountStake(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalanceStake(_optyVault, _liquidityPool);
        uint256 _balanceInToken = getAllAmountInTokenStake(_optyVault, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }

    function isRedeemableAmountSufficientStake(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInTokenStake(_optyVault, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    function getUnstakeAndWithdrawSomeCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_redeemAmount > 0) {
            _codes = new bytes[](4);
            _codes[0] = getUnstakeSomeCodes(_liquidityPool, _redeemAmount)[0];
            bytes[] memory _withdrawCodes =
                getWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _redeemAmount);
            _codes[1] = _withdrawCodes[0];
            _codes[2] = _withdrawCodes[1];
            _codes[3] = _withdrawCodes[2];
        }
    }

    function getUnstakeAndWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalanceStake(_optyVault, _liquidityPool);
        return getUnstakeAndWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    function getMinter(address _gauge) public view returns (address) {
        return ICurveGauge(_gauge).minter();
    }

    function setLiquidityPoolToUnderlyingTokens(address _lendingPool, address[] memory _tokens) public onlyOperator {
        liquidityPoolToUnderlyingTokens[_lendingPool] = _tokens;
    }

    function setLiquiidtyPoolToGauges(address _pool, address _gauge) public onlyOperator {
        liquidityPoolToGauges[_pool] = _gauge;
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
    ) internal view returns (bytes[] memory _codes) {
        uint256[2] memory _amountsIn;
        uint256[] memory _amountsAux = new uint256[](2);
        uint8 _codeLength = 1;
        bool _isAmount = false;
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
        _amountsAux = _getDeposit2Amount(_liquidityPool, _amounts);
        _codes = new bytes[](_codeLength);
        uint8 _j = 0;
        for (uint8 i = 0; i < 2; i++) {
            _amountsIn[i] = _amountsAux[i];
            if (_amountsIn[i] > 0) {
                _isAmount = true;
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
        if (_isAmount) {
            _codes[_j] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature("add_liquidity(uint256[2],uint256)", _amountsIn, uint256(0))
            );
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
    ) internal view returns (bytes[] memory _codes) {
        uint256[3] memory _amountsIn;
        uint256[] memory _amountsAux = new uint256[](3);
        uint8 _codeLength = 1;
        bool _isAmount = false;
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
        _amountsAux = _getDeposit3Amount(_liquidityPool, _amounts);
        _codes = new bytes[](_codeLength);
        uint8 _j = 0;
        for (uint8 i = 0; i < 3; i++) {
            _amountsIn[i] = _amountsAux[i];
            if (_amountsIn[i] > 0) {
                _isAmount = true;
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
        if (_isAmount) {
            _codes[_j] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature("add_liquidity(uint256[3],uint256)", _amountsIn, uint256(0))
            );
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
    ) internal view returns (bytes[] memory _codes) {
        uint256[2] memory _amountsIn;
        uint256[] memory _amountsAux = new uint256[](4);
        uint8 _codeLength = 1;
        bool _isAmount = false;
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
        _amountsAux = _getDeposit4Amount(_liquidityPool, _amounts);
        _codes = new bytes[](_codeLength);
        uint8 _j = 0;
        for (uint8 i = 0; i < 4; i++) {
            _amountsIn[i] = _amountsAux[i];
            if (_amountsIn[i] > 0) {
                _isAmount = true;
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
        if (_isAmount) {
            _codes[_j] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature("add_liquidity(uint256[4],uint256)", _amountsIn, uint256(0))
            );
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
            _codes[0] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
            );
            _codes[1] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount)
            );
            _codes[2] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature(
                    "remove_liquidity_one_coin(uint256,int128,uint256,bool)",
                    _amount,
                    i,
                    uint256(0),
                    true
                )
            );
        }
    }

    /**
     * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
     *
     * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
     * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
     */
    function _getWithdraw2Code(address _liquidityPool, uint256 _amount) internal view returns (bytes[] memory _codes) {
        if (_amount > 0) {
            uint256[2] memory _minAmountOut = [uint256(0), uint256(0)];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
            );
            _codes[1] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount)
            );
            _codes[2] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature("remove_liquidity(uint256,uint256[2])", _amount, _minAmountOut)
            );
        }
    }

    /**
     * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
     *
     * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
     * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
     */
    function _getWithdraw3Code(address _liquidityPool, uint256 _amount) internal view returns (bytes[] memory _codes) {
        if (_amount > 0) {
            uint256[3] memory _minAmountOut = [uint256(0), uint256(0), uint256(0)];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
            );
            _codes[1] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount)
            );
            _codes[2] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature("remove_liquidity(uint256,uint256[3])", _amount, _minAmountOut)
            );
        }
    }

    /**
     * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
     *
     * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
     * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
     */
    function _getWithdraw4Code(address _liquidityPool, uint256 _amount) internal view returns (bytes[] memory _codes) {
        if (_amount > 0) {
            uint256[4] memory _minAmountOut = [uint256(0), uint256(0), uint256(0), uint256(0)];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
            );
            _codes[1] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount)
            );
            _codes[2] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature("remove_liquidity(uint256,uint256[4])", _amount, _minAmountOut)
            );
        }
    }

    function _getDepositAmountPct(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _poolValue,
        uint256 _amount
    ) internal view returns (uint256) {
        uint256 _maxDepositPct;
        if (maxDepositPoolPct[_liquidityPool] == uint256(0)) {
            _maxDepositPct = maxDepositPoolPctDefault;
        } else if (maxDepositPoolPct[_liquidityPool] == uint256(-1)) {
            return _amount;
        } else {
            _maxDepositPct = maxDepositPoolPct[_liquidityPool];
        }
        uint256 _amountInUSD = oracleContract.getUnderlyingTokenAmountInUSD(_amount, _underlyingToken);
        uint256 _maxAmountInUSD = _poolValue.mul(_maxDepositPct).div(uint256(10000));
        if (_amountInUSD > _maxAmountInUSD) {
            return oracleContract.getUSDAmountInUnderlyingToken(_maxAmountInUSD, _underlyingToken);
        } else {
            return _amount;
        }
    }

    function _getDeposit2Amount(address _liquidityPool, uint256[] memory _amounts)
        internal
        view
        returns (uint256[] memory)
    {
        uint256[2] memory _maxDepositAmounts;
        uint256[] memory _depositAmounts = new uint256[](2);
        for (uint256 i = 0; i < 2; i++) {
            if ((maxDeposit2Amount[_liquidityPool])[i] == uint256(0)) {
                _maxDepositAmounts[i] = maxDepositAmountDefault[i];
            } else {
                _maxDepositAmounts[i] = maxDeposit2Amount[_liquidityPool][i];
            }
            if (_maxDepositAmounts[i] > _amounts[i]) {
                _depositAmounts[i] = _amounts[i];
            } else {
                _depositAmounts[i] = _maxDepositAmounts[i];
            }
        }
        return _depositAmounts;
    }

    function _getDeposit3Amount(address _liquidityPool, uint256[] memory _amounts)
        internal
        view
        returns (uint256[] memory)
    {
        uint256[3] memory _maxDepositAmounts;
        uint256[] memory _depositAmounts = new uint256[](3);
        for (uint256 i = 0; i < 3; i++) {
            if ((maxDeposit3Amount[_liquidityPool])[i] == uint256(0)) {
                _maxDepositAmounts[i] = maxDepositAmountDefault[i];
            } else {
                _maxDepositAmounts[i] = maxDeposit3Amount[_liquidityPool][i];
            }
            if (_maxDepositAmounts[i] > _amounts[i]) {
                _depositAmounts[i] = _amounts[i];
            } else {
                _depositAmounts[i] = _maxDepositAmounts[i];
            }
        }
        return _depositAmounts;
    }

    function _getDeposit4Amount(address _liquidityPool, uint256[] memory _amounts)
        internal
        view
        returns (uint256[] memory)
    {
        uint256[4] memory _maxDepositAmounts;
        uint256[] memory _depositAmounts = new uint256[](4);
        for (uint256 i = 0; i < 4; i++) {
            if ((maxDeposit4Amount[_liquidityPool])[i] == uint256(0)) {
                _maxDepositAmounts[i] = maxDepositAmountDefault[i];
            } else {
                _maxDepositAmounts[i] = maxDeposit4Amount[_liquidityPool][i];
            }
            if (_maxDepositAmounts[i] > _amounts[i]) {
                _depositAmounts[i] = _amounts[i];
            } else {
                _depositAmounts[i] = _maxDepositAmounts[i];
            }
        }
        return _depositAmounts;
    }

    function _getUnderlyingTokens(address _liquidityPool) internal view returns (address[] memory _underlyingTokens) {
        _underlyingTokens = liquidityPoolToUnderlyingTokens[_liquidityPool];
    }

    function setHarvestCodeProvider(address _harvestCodeProvider) public onlyOperator {
        harvestCodeProviderContract = HarvestCodeProvider(_harvestCodeProvider);
    }

    function setMaxDepositPoolPctDefault(uint256 _maxDepositPoolPctDefault) public onlyGovernance {
        maxDepositPoolPctDefault = _maxDepositPoolPctDefault;
    }

    function setMaxDepositPoolPct(address _liquidityPool, uint256 _maxDepositPoolPct) public onlyGovernance {
        maxDepositPoolPct[_liquidityPool] = _maxDepositPoolPct;
    }

    function setMaxDepositAmountDefault(uint256[4] memory _maxDepositAmountDefault) public onlyGovernance {
        maxDepositAmountDefault = _maxDepositAmountDefault;
    }

    function setMaxDeposit2Amount(address _liquidityPool, uint256[2] memory _maxDepositAmount) public onlyGovernance {
        maxDeposit2Amount[_liquidityPool] = _maxDepositAmount;
    }

    function setMaxDeposit3Amount(address _liquidityPool, uint256[3] memory _maxDepositAmount) public onlyGovernance {
        maxDeposit3Amount[_liquidityPool] = _maxDepositAmount;
    }

    function setMaxDeposit4Amount(address _liquidityPool, uint256[4] memory _maxDepositAmount) public onlyGovernance {
        maxDeposit4Amount[_liquidityPool] = _maxDepositAmount;
    }

    function setLiquidityPoolToSwap(address _liquidityPool, address _swapPool) public onlyGovernance {
        liquidityPoolToSwap[_liquidityPool] = _swapPool;
    }

    function setOracle(address _oracle) public onlyOperator {
        oracleContract = PriceOracle(_oracle);
    }
}
