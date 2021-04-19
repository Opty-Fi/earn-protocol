// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IAdapter.sol";
import "../../interfaces/harvest.finance/IHarvestDeposit.sol";
import "../../interfaces/harvest.finance/IHarvestFarm.sol";
import "../../libraries/SafeMath.sol";
import "../../utils/Modifiers.sol";
import "../../HarvestCodeProvider.sol";

contract HarvestAdapter is IAdapter, Modifiers {
    using SafeMath for uint256;

    HarvestCodeProvider public harvestCodeProviderContract;
    mapping(address => address) public liquidityPoolToStakingPool;
    address public rewardToken;

    enum MaxExposure { Number, Pct }
    MaxExposure public maxExposureType;
    uint256 public maxDepositPoolPctDefault; // basis points
    mapping(address => uint256) public maxDepositPoolPct; // basis points
    uint256 public maxDepositAmountDefault;
    mapping(address => uint256) public maxDepositAmount;

    // deposit pool
    address public constant TBTC_SBTC_CRV_DEPOSIT_POOL = address(0x640704D106E79e105FDA424f05467F005418F1B5);
    address public constant THREE_CRV_DEPOSIT_POOL = address(0x71B9eC42bB3CB40F017D8AD8011BE8e384a95fa5);
    address public constant YDAI_YUSDC_YUSDT_YTUSD_DEPOSIT_POOL = address(0x0FE4283e0216F94f5f9750a7a11AC54D3c9C38F3);
    address public constant F_DAI_DEPOSIT_POOL = address(0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C);
    address public constant F_USDC_DEPOSIT_POOL = address(0xf0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE);
    address public constant F_USDT_DEPOSIT_POOL = address(0x053c80eA73Dc6941F518a68E2FC52Ac45BDE7c9C);
    address public constant F_TUSD_DEPOSIT_POOL = address(0x7674622c63Bee7F46E86a4A5A18976693D54441b);
    address public constant F_CRV_REN_WBTC_DEPOSIT_POOL = address(0x9aA8F427A17d6B0d91B6262989EdC7D45d6aEdf8);
    address public constant F_WBTC_DEPOSIT_POOL = address(0x5d9d25c7C457dD82fc8668FFC6B9746b674d4EcB);
    address public constant F_RENBTC_DEPOSIT_POOL = address(0xC391d1b08c1403313B0c28D47202DFDA015633C4);
    address public constant F_WETH_DEPOSIT_POOL = address(0xFE09e53A81Fe2808bc493ea64319109B5bAa573e);
    address public constant F_CDAI_CUSDC_DEPOSIT_POOL = address(0x998cEb152A42a3EaC1f555B1E911642BeBf00faD);
    address public constant F_USDN_THREE_CRV_DEPOSIT_POOL = address(0x683E683fBE6Cf9b635539712c999f3B3EdCB8664);
    address public constant F_YDAI_YUSDC_YUSDT_YBUSD_DEPOSIT_POOL = address(0x4b1cBD6F6D8676AcE5E412C78B7a59b4A1bbb68a);

    // staking pool
    address public constant TBTC_SBTC_CRV_STAKE_POOL = address(0x017eC1772A45d2cf68c429A820eF374f0662C57c);
    address public constant THREE_CRV_STAKE_POOL = address(0x27F12d1a08454402175b9F0b53769783578Be7d9);
    address public constant YDAI_YUSDC_YUSDT_YTUSD_STAKE_POOL = address(0x6D1b6Ea108AA03c6993d8010690264BA96D349A8);
    address public constant F_DAI_STAKE_POOL = address(0x15d3A64B2d5ab9E152F16593Cdebc4bB165B5B4A);
    address public constant F_USDC_STAKE_POOL = address(0x4F7c28cCb0F1Dbd1388209C67eEc234273C878Bd);
    address public constant F_USDT_STAKE_POOL = address(0x6ac4a7AB91E6fD098E13B7d347c6d4d1494994a2);
    address public constant F_TUSD_STAKE_POOL = address(0xeC56a21CF0D7FeB93C25587C12bFfe094aa0eCdA);
    address public constant F_CRV_RENBTC_STAKE_POOL = address(0xA3Cf8D1CEe996253FAD1F8e3d68BDCba7B3A3Db5);
    address public constant F_WBTC_STAKE_POOL = address(0x917d6480Ec60cBddd6CbD0C8EA317Bcc709EA77B);
    address public constant F_RENBTC_STAKE_POOL = address(0x7b8Ff8884590f44e10Ea8105730fe637Ce0cb4F6);
    address public constant F_WETH_STAKE_POOL = address(0x3DA9D911301f8144bdF5c3c67886e5373DCdff8e);
    address public constant F_CDAI_CUSDC_STAKE_POOL = address(0xC0f51a979e762202e9BeF0f62b07F600d0697DE1);
    address public constant F_USDN_THREE_CRV_STAKE_POOL = address(0xef4Da1CE3f487DA2Ed0BE23173F76274E0D47579);
    address public constant F_YDAI_YUSDC_YUSDT_YBUSD_STAKE_POOL = address(0x093C2ae5E6F3D2A897459aa24551289D462449AD);

    constructor(address _registry, address _harvestCodeProvider) public Modifiers(_registry) {
        setHarvestCodeProvider(_harvestCodeProvider);
        setRewardToken(address(0xa0246c9032bC3A600820415aE600c6388619A14D));
        setLiquidityPoolToStakingPool(TBTC_SBTC_CRV_DEPOSIT_POOL, TBTC_SBTC_CRV_STAKE_POOL);
        setLiquidityPoolToStakingPool(THREE_CRV_DEPOSIT_POOL, THREE_CRV_STAKE_POOL);
        setLiquidityPoolToStakingPool(YDAI_YUSDC_YUSDT_YTUSD_DEPOSIT_POOL, YDAI_YUSDC_YUSDT_YTUSD_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_DAI_DEPOSIT_POOL, F_DAI_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_USDC_DEPOSIT_POOL, F_USDC_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_USDT_DEPOSIT_POOL, F_USDT_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_TUSD_DEPOSIT_POOL, F_TUSD_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_CRV_REN_WBTC_DEPOSIT_POOL, F_CRV_RENBTC_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_WBTC_DEPOSIT_POOL, F_WBTC_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_RENBTC_DEPOSIT_POOL, F_RENBTC_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_WETH_DEPOSIT_POOL, F_WETH_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_CDAI_CUSDC_DEPOSIT_POOL, F_CDAI_CUSDC_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_USDN_THREE_CRV_DEPOSIT_POOL, F_USDN_THREE_CRV_STAKE_POOL);
        setLiquidityPoolToStakingPool(F_YDAI_YUSDC_YUSDT_YBUSD_DEPOSIT_POOL, F_YDAI_YUSDC_YUSDT_YBUSD_STAKE_POOL);

        setMaxDepositPoolPctDefault(uint256(10000)); // 100%
        setMaxDepositPoolType(MaxExposure.Number);
    }

    function getPoolValue(address _liquidityPool, address) public view override returns (uint256) {
        return IHarvestDeposit(_liquidityPool).underlyingBalanceWithInvestment();
    }

    function getDepositSomeCodes(
        address payable,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        if (_amounts[0] > 0) {
            uint256 _depositAmount = _getDepositAmount(_liquidityPool, _amounts[0]);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0)));
            _codes[1] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _depositAmount));
            _codes[2] = abi.encode(_liquidityPool, abi.encodeWithSignature("deposit(uint256)", _depositAmount));
        }
    }

    function getDepositAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyVault);
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

    function getWithdrawSomeCodes(
        address payable,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _shares
    ) public view override returns (bytes[] memory _codes) {
        if (_shares > 0) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                getLiquidityPoolToken(_underlyingTokens[0], _liquidityPool),
                abi.encodeWithSignature("withdraw(uint256)", _shares)
            );
        }
    }

    function getWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return _liquidityPool;
    }

    function getUnderlyingTokens(address _liquidityPool, address) public view override returns (address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IHarvestDeposit(_liquidityPool).underlying();
    }

    function getAllAmountInToken(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        return getSomeAmountInToken(_underlyingToken, _liquidityPool, getLiquidityPoolTokenBalance(_optyVault, _underlyingToken, _liquidityPool));
    }

    function getLiquidityPoolTokenBalance(
        address payable _optyVault,
        address,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IERC20(_liquidityPool).balanceOf(_optyVault);
    }

    function getSomeAmountInToken(
        address,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(IHarvestDeposit(_liquidityPool).getPricePerFullShare()).div(
                10**IHarvestDeposit(_liquidityPool).decimals()
            );
        }
        return _liquidityPoolTokenAmount;
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

    function calculateAmountInLPToken(
        address,
        address _liquidityPool,
        uint256 _depositAmount
    ) public view override returns (uint256) {
        return _depositAmount.mul(10**IHarvestDeposit(_liquidityPool).decimals()).div(IHarvestDeposit(_liquidityPool).getPricePerFullShare());
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

    function getRewardToken(address) public view override returns (address) {
        return rewardToken;
    }

    function getUnclaimedRewardTokenAmount(address payable _optyVault, address _liquidityPool) public view override returns (uint256) {
        return IHarvestFarm(liquidityPoolToStakingPool[_liquidityPool]).earned(_optyVault);
    }

    function getClaimRewardTokenCode(address payable, address _liquidityPool) public view override returns (bytes[] memory _codes) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_stakingPool, abi.encodeWithSignature("getReward()"));
    }

    function getHarvestSomeCodes(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _rewardTokenAmount
    ) public view override returns (bytes[] memory _codes) {
        return harvestCodeProviderContract.getHarvestCodes(_optyVault, getRewardToken(_liquidityPool), _underlyingToken, _rewardTokenAmount);
    }

    function getHarvestAllCodes(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _rewardTokenAmount = IERC20(getRewardToken(_liquidityPool)).balanceOf(_optyVault);
        return getHarvestSomeCodes(_optyVault, _underlyingToken, _liquidityPool, _rewardTokenAmount);
    }

    function canStake(address) public view override returns (bool) {
        return true;
    }

    function getStakeSomeCodes(address _liquidityPool, uint256 _shares) public view override returns (bytes[] memory _codes) {
        if (_shares > 0) {
            address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _stakingPool, uint256(0)));
            _codes[1] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _stakingPool, _shares));
            _codes[2] = abi.encode(_stakingPool, abi.encodeWithSignature("stake(uint256)", _shares));
        }
    }

    function getStakeAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _depositAmount = getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPool);
        return getStakeSomeCodes(_liquidityPool, _depositAmount);
    }

    function getUnstakeSomeCodes(address _liquidityPool, uint256 _shares) public view override returns (bytes[] memory _codes) {
        if (_shares > 0) {
            address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
            _codes = new bytes[](1);
            _codes[0] = abi.encode(_stakingPool, abi.encodeWithSignature("withdraw(uint256)", _shares));
        }
    }

    function getUnstakeAllCodes(address payable _optyVault, address _liquidityPool) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalanceStake(_optyVault, _liquidityPool);
        return getUnstakeSomeCodes(_liquidityPool, _redeemAmount);
    }

    function getAllAmountInTokenStake(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        uint256 b = IHarvestFarm(_stakingPool).balanceOf(_optyVault);
        if (b > 0) {
            b = b.mul(IHarvestDeposit(_liquidityPool).getPricePerFullShare()).div(1e18);
        }
        uint256 _unclaimedReward = getUnclaimedRewardTokenAmount(_optyVault, _liquidityPool);
        if (_unclaimedReward > 0) {
            b = b.add(harvestCodeProviderContract.rewardBalanceInUnderlyingTokens(rewardToken, _underlyingToken, _unclaimedReward));
        }
        return b;
    }

    function getLiquidityPoolTokenBalanceStake(address payable _optyVault, address _liquidityPool) public view override returns (uint256) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        return IHarvestFarm(_stakingPool).balanceOf(_optyVault);
    }

    function calculateRedeemableLPTokenAmountStake(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        uint256 _liquidityPoolTokenBalance = IHarvestFarm(_stakingPool).balanceOf(_optyVault);
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
        uint256 _balanceInTokenStake = getAllAmountInTokenStake(_optyVault, _underlyingToken, _liquidityPool);
        return _balanceInTokenStake >= _redeemAmount;
    }

    function getUnstakeAndWithdrawSomeCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_redeemAmount > 0) {
            _codes = new bytes[](2);
            _codes[0] = getUnstakeSomeCodes(_liquidityPool, _redeemAmount)[0];
            _codes[1] = getWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _redeemAmount)[0];
        }
    }

    function getUnstakeAndWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _unstakeAmount = getLiquidityPoolTokenBalanceStake(_optyVault, _liquidityPool);
        return getUnstakeAndWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _unstakeAmount);
    }

    function setHarvestCodeProvider(address _harvestCodeProvider) public onlyGovernance {
        harvestCodeProviderContract = HarvestCodeProvider(_harvestCodeProvider);
    }

    function setLiquidityPoolToStakingPool(address _liquidityPool, address _stakingPool) public onlyOperator {
        require(liquidityPoolToStakingPool[_liquidityPool] != _stakingPool, "liquidityPoolToStakingPool already set");
        liquidityPoolToStakingPool[_liquidityPool] = _stakingPool;
    }

    function _getUnderlyingToken(address _liquidityPoolToken) internal view returns (address) {
        return IHarvestDeposit(_liquidityPoolToken).underlying();
    }

    function setRewardToken(address _rewardToken) public onlyOperator {
        rewardToken = _rewardToken;
    }

    function setMaxDepositPoolType(MaxExposure _type) public onlyGovernance {
        maxExposureType = _type;
    }

    function setMaxDepositPoolPctDefault(uint256 _maxDepositPoolPctDefault) public onlyGovernance {
        maxDepositPoolPctDefault = _maxDepositPoolPctDefault;
    }
    
    function setMaxDepositPoolPct(address _liquidityPool, uint256 _maxDepositPoolPct) public onlyGovernance {
        maxDepositPoolPct[_liquidityPool] = _maxDepositPoolPct;
    }
    
    function setMaxDepositAmountDefault(uint256 _maxDepositAmountDefault) public onlyGovernance {
        maxDepositAmountDefault = _maxDepositAmountDefault;
    }
    
    function setMaxDepositAmount(address _liquidityPool, uint256 _maxDepositAmount) public onlyGovernance {
        maxDepositAmount[_liquidityPool] = _maxDepositAmount;
    }

    function _getDepositAmount(address _liquidityPool, uint256 _amount) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 _limit = maxExposureType == MaxExposure.Pct ? _getMaxDepositAmountByPct(_liquidityPool, _amount) : _getMaxDepositAmount(_liquidityPool, _amount);
        if (_limit != 0 && _depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }
    
    function _getMaxDepositAmountByPct(address _liquidityPool, uint256 _amount) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 _poolValue = getPoolValue(_liquidityPool, address(0));
        uint256 maxPct = maxDepositPoolPct[_liquidityPool];
        if (maxPct == 0) {
            maxPct = maxDepositPoolPctDefault;
        }
        uint256 _limit = (_poolValue.mul(maxPct)).div(uint256(10000));
        if (_depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }
    
    function _getMaxDepositAmount(address _liquidityPool, uint256 _amount) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 maxDeposit = maxDepositAmount[_liquidityPool];
        if (maxDeposit == 0) {
            maxDeposit = maxDepositAmountDefault;
        }
        if ( _depositAmount > maxDeposit) {
            _depositAmount = maxDeposit;
        }
    }
}
