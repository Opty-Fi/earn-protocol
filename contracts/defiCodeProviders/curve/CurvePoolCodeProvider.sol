// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/curve/ICurveDeposit.sol";
import "../../interfaces/curve/ICurveGauge.sol";
import "../../interfaces/curve/ITokenMinter.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/Modifiers.sol";
import "../../Gatherer.sol";

contract CurvePoolCodeProvider is ICodeProvider, Modifiers {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    mapping(address => address[]) public liquidityPoolToUnderlyingTokens;
    mapping(address => address) public liquidityPoolToGauges;
    Gatherer public gathererContract;
    uint256 public maxExposure; // basis points

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

    /**
     * @dev map coins and tokens to curve deposit pool
     */
    constructor(address _registry, address _gatherer) public Modifiers(_registry) {
        setGatherer(_gatherer);
        // deposit pool
        address[] memory _compoundUnderlyingTokens = new address[](2);
        _compoundUnderlyingTokens[0] = DAI;
        _compoundUnderlyingTokens[1] = USDC;
        setLiquidityPoolToUnderlyingTokens(COMPOUND_DEPOSIT_POOL, _compoundUnderlyingTokens);

        address[] memory _usdtUnderlyingTokens = new address[](3);
        _usdtUnderlyingTokens[0] = DAI;
        _usdtUnderlyingTokens[1] = USDC;
        _usdtUnderlyingTokens[2] = USDT;
        setLiquidityPoolToUnderlyingTokens(USDT_DEPOSIT_POOL, _usdtUnderlyingTokens);

        address[] memory _paxUnderlyingTokens = new address[](4);
        _paxUnderlyingTokens[0] = DAI;
        _paxUnderlyingTokens[1] = USDC;
        _paxUnderlyingTokens[2] = USDT;
        _paxUnderlyingTokens[3] = PAX;
        setLiquidityPoolToUnderlyingTokens(PAX_DEPOSIT_POOL, _paxUnderlyingTokens);

        address[] memory _yUnderlyingTokens = new address[](4);
        _yUnderlyingTokens[0] = DAI;
        _yUnderlyingTokens[1] = USDC;
        _yUnderlyingTokens[2] = USDT;
        _yUnderlyingTokens[3] = TUSD;
        setLiquidityPoolToUnderlyingTokens(Y_DEPOSIT_POOL, _yUnderlyingTokens);

        address[] memory _busdUnderlyingTokens = new address[](4);
        _busdUnderlyingTokens[0] = DAI;
        _busdUnderlyingTokens[1] = USDC;
        _busdUnderlyingTokens[2] = USDT;
        _busdUnderlyingTokens[3] = BUSD;
        setLiquidityPoolToUnderlyingTokens(BUSD_DEPOSIT_POOL, _busdUnderlyingTokens);

        address[] memory _susdUnderlyingTokens = new address[](4);
        _susdUnderlyingTokens[0] = DAI;
        _susdUnderlyingTokens[1] = USDC;
        _susdUnderlyingTokens[2] = USDT;
        _susdUnderlyingTokens[3] = SUSD;
        setLiquidityPoolToUnderlyingTokens(SUSD_DEPOSIT_POOL, _susdUnderlyingTokens);

        address[] memory _gusdUnderlyingTokens = new address[](4);
        _gusdUnderlyingTokens[0] = GUSD;
        _gusdUnderlyingTokens[1] = DAI;
        _gusdUnderlyingTokens[2] = USDC;
        _gusdUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(GUSD_DEPOSIT_POOL, _gusdUnderlyingTokens); // GUSD,DAI,USDC,USDT

        address[] memory _husdUnderlyingTokens = new address[](4);
        _gusdUnderlyingTokens[0] = HUSD;
        _gusdUnderlyingTokens[1] = DAI;
        _gusdUnderlyingTokens[2] = USDC;
        _gusdUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(HUSD_DEPOSIT_POOL, _husdUnderlyingTokens); // HUSD, DAI,USDC,USDT

        address[] memory _usdkUnderlyingTokens = new address[](4);
        _usdkUnderlyingTokens[0] = USDK;
        _usdkUnderlyingTokens[1] = DAI;
        _usdkUnderlyingTokens[2] = USDC;
        _usdkUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(USDK_DEPOSIT_POOL, _usdkUnderlyingTokens); // USDK, DAI.USDC,USDT

        address[] memory _usdnUnderlyingTokens = new address[](4);
        _usdnUnderlyingTokens[0] = USDN;
        _usdnUnderlyingTokens[1] = DAI;
        _usdnUnderlyingTokens[2] = USDC;
        _usdnUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(USDN_DEPOSIT_POOL, _usdnUnderlyingTokens); // USDN, DAI, USDC, USDT

        address[] memory _linkusdUnderlyingTokens = new address[](4);
        _linkusdUnderlyingTokens[0] = LINKUSD;
        _linkusdUnderlyingTokens[1] = DAI;
        _linkusdUnderlyingTokens[2] = USDC;
        _linkusdUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(LINKUSD_DEPOSIT_POOL, _linkusdUnderlyingTokens); // LINKUSD, DAI, USDC, USDT

        address[] memory _musdUnderlyingTokens = new address[](4);
        _musdUnderlyingTokens[0] = MUSD;
        _musdUnderlyingTokens[1] = DAI;
        _musdUnderlyingTokens[2] = USDC;
        _musdUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(MUSD_DEPOSIT_POOL, _musdUnderlyingTokens); // MUSD, DAI, USDC, USDT

        address[] memory _rsvUnderlyingTokens = new address[](4);
        _rsvUnderlyingTokens[0] = RSV;
        _rsvUnderlyingTokens[1] = DAI;
        _rsvUnderlyingTokens[2] = USDC;
        _rsvUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(RSV_DEPOSIT_POOL, _rsvUnderlyingTokens); // RSV, DAI, USDC, USDT

        address[] memory _tbtcUnderlyingTokens = new address[](4);
        _tbtcUnderlyingTokens[0] = TBTC;
        _tbtcUnderlyingTokens[1] = DAI;
        _tbtcUnderlyingTokens[2] = USDC;
        _tbtcUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(TBTC_DEPOSIT_POOL, _tbtcUnderlyingTokens); // TBTC, DAI, USDC, USDT

        address[] memory _dusdUnderlyingTokens = new address[](4);
        _dusdUnderlyingTokens[0] = DUSD;
        _dusdUnderlyingTokens[1] = DAI;
        _dusdUnderlyingTokens[2] = USDC;
        _dusdUnderlyingTokens[3] = USDT;
        setLiquidityPoolToUnderlyingTokens(DUSD_DEPOSIT_POOL, _dusdUnderlyingTokens); // DUSD, DAI, USDC, USDT

        // set liquidity pool to gauges
        setLiquiidtyPoolToGauges(COMPOUND_DEPOSIT_POOL, address(0x7ca5b0a2910B33e9759DC7dDB0413949071D7575));
        setLiquiidtyPoolToGauges(USDT_DEPOSIT_POOL, address(0xBC89cd85491d81C6AD2954E6d0362Ee29fCa8F53));
        setLiquiidtyPoolToGauges(PAX_DEPOSIT_POOL, address(0x64E3C23bfc40722d3B649844055F1D51c1ac041d));
        setLiquiidtyPoolToGauges(Y_DEPOSIT_POOL, address(0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1));
        setLiquiidtyPoolToGauges(BUSD_DEPOSIT_POOL, address(0x69Fb7c45726cfE2baDeE8317005d3F94bE838840));
        setLiquiidtyPoolToGauges(SUSD_DEPOSIT_POOL, address(0xA90996896660DEcC6E997655E065b23788857849));
        setLiquiidtyPoolToGauges(GUSD_DEPOSIT_POOL, address(0xC5cfaDA84E902aD92DD40194f0883ad49639b023));
        setLiquiidtyPoolToGauges(HUSD_DEPOSIT_POOL, address(0x2db0E83599a91b508Ac268a6197b8B14F5e72840));
        setLiquiidtyPoolToGauges(USDK_DEPOSIT_POOL, address(0xC2b1DF84112619D190193E48148000e3990Bf627));
        setLiquiidtyPoolToGauges(USDN_DEPOSIT_POOL, address(0xF98450B5602fa59CC66e1379DFfB6FDDc724CfC4));
        setLiquiidtyPoolToGauges(MUSD_DEPOSIT_POOL, address(0x5f626c30EC1215f4EdCc9982265E8b1F411D1352));
        setLiquiidtyPoolToGauges(RSV_DEPOSIT_POOL, address(0x4dC4A289a8E33600D8bD4cf5F6313E43a37adec7));
        setLiquiidtyPoolToGauges(TBTC_DEPOSIT_POOL, address(0x6828bcF74279eE32f2723eC536c22c51Eed383C6));
        setLiquiidtyPoolToGauges(DUSD_DEPOSIT_POOL, address(0xAEA6c312f4b3E04D752946d329693F7293bC2e6D));

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
        address payable,
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
        address payable _optyPool,
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
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _amount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _amount);
    }

    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return ICurveDeposit(_liquidityPool).token();
    }

    function getUnderlyingTokens(address _liquidityPool, address) public view override returns (address[] memory _underlyingTokens) {
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
        address payable _optyPool,
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
        address payable _optyPool,
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
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyPool, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    function getRewardToken(address _liquidityPool) public view override returns (address) {
        if (liquidityPoolToGauges[_liquidityPool] != address(0)) {
            return ITokenMinter(getMinter(liquidityPoolToGauges[_liquidityPool])).token();
        }
        return address(0);
    }

    function getUnclaimedRewardTokenAmount(address payable, address _liquidityPool) public view override returns (uint256) {
        if (liquidityPoolToGauges[_liquidityPool] != address(0)) {
            // TODO : get the amount of unclaimed CRV tokens
        }
        return uint256(0);
    }

    function getClaimRewardTokenCode(address payable, address _liquidityPool) public view override returns (bytes[] memory _codes) {
        if (liquidityPoolToGauges[_liquidityPool] != address(0)) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                getMinter(liquidityPoolToGauges[_liquidityPool]),
                abi.encodeWithSignature("mint(address)", liquidityPoolToGauges[_liquidityPool])
            );
        }
    }

    function getHarvestSomeCodes(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _rewardTokenAmount
    ) public view override returns (bytes[] memory _codes) {
        return gathererContract.getHarvestCodes(_optyPool, getRewardToken(_liquidityPool), _underlyingToken, _rewardTokenAmount);
    }

    function getHarvestAllCodes(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _rewardTokenAmount = IERC20(getRewardToken(_liquidityPool)).balanceOf(_optyPool);
        return getHarvestSomeCodes(_optyPool, _underlyingToken, _liquidityPool, _rewardTokenAmount);
    }

    function canStake(address _liquidityPool) public view override returns (bool) {
        if (liquidityPoolToGauges[_liquidityPool] != address(0)) {
            return true;
        }
        return false;
    }

    function getStakeSomeCodes(address _liquidityPool, uint256 _stakeAmount) public view override returns (bytes[] memory _codes) {
        if (_stakeAmount > 0) {
            address _gauge = liquidityPoolToGauges[_liquidityPool];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _gauge, uint256(0)));
            _codes[1] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _gauge, _stakeAmount));
            _codes[2] = abi.encode(_gauge, abi.encodeWithSignature("deposit(uint256)", _stakeAmount));
        }
    }

    function getStakeAllCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _stakeAmount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPool);
        return getStakeSomeCodes(_liquidityPool, _stakeAmount);
    }

    function getUnstakeSomeCodes(address _liquidityPool, uint256 _unstakeAmount) public view override returns (bytes[] memory _codes) {
        if (_unstakeAmount > 0) {
            address _gauge = liquidityPoolToGauges[_liquidityPool];
            _codes = new bytes[](1);
            _codes[0] = abi.encode(_gauge, abi.encodeWithSignature("withdraw(uint256)", _unstakeAmount));
        }
    }

    function getUnstakeAllCodes(address payable _optyPool, address _liquidityPool) public view override returns (bytes[] memory _codes) {
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
        address payable _optyPool,
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
        uint256 _liquidityPoolTokenAmount = ICurveGauge(_gauge).balanceOf(_optyPool);
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

    function getLiquidityPoolTokenBalanceStake(address payable _optyPool, address _liquidityPool) public view override returns (uint256) {
        return ICurveGauge(liquidityPoolToGauges[_liquidityPool]).balanceOf(_optyPool);
    }

    function calculateRedeemableLPTokenAmountStake(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalanceStake(_optyPool, _liquidityPool);
        uint256 _balanceInToken = getAllAmountInTokenStake(_optyPool, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }

    function isRedeemableAmountSufficientStake(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInTokenStake(_optyPool, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    function getUnstakeAndWithdrawSomeCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_redeemAmount > 0) {
            _codes = new bytes[](4);
            _codes[0] = getUnstakeSomeCodes(_liquidityPool, _redeemAmount)[0];
            bytes[] memory _withdrawCodes = getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _redeemAmount);
            _codes[1] = _withdrawCodes[0];
            _codes[2] = _withdrawCodes[1];
            _codes[3] = _withdrawCodes[2];
        }
    }

    function getUnstakeAndWithdrawAllCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalanceStake(_optyPool, _liquidityPool);
        return getUnstakeAndWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _redeemAmount);
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
        if (_IsAmount) {
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
        if (_IsAmount) {
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
            _codes[0] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0)));
            _codes[1] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount));
            _codes[2] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature("remove_liquidity_one_coin(uint256,int128,uint256,bool)", _amount, i, uint256(0), true)
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
        if (_amount > 0) {
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
        if (_amount > 0) {
            uint256[4] memory _minAmountOut = [uint256(0), uint256(0), uint256(0), uint256(0)];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0)));
            _codes[1] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount));
            _codes[2] = abi.encode(_liquidityPool, abi.encodeWithSignature("remove_liquidity(uint256,uint256[4])", _amount, _minAmountOut));
        }
    }

    function _getUnderlyingTokens(address _liquidityPool) internal view returns (address[] memory _underlyingTokens) {
        _underlyingTokens = liquidityPoolToUnderlyingTokens[_liquidityPool];
    }

    function setGatherer(address _gatherer) public onlyOperator {
        gathererContract = Gatherer(_gatherer);
    }

    function setMaxExposure(uint256 _maxExposure) public onlyOperator {
        maxExposure = _maxExposure;
    }
}
