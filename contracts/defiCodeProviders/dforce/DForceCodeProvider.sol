// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/dforce/IDForceDeposit.sol";
import "../../interfaces/dforce/IDForceStake.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../utils/Modifiers.sol";
import "../../Gatherer.sol";

contract DForceCodeProvider is ICodeProvider, Modifiers {
    using SafeMath for uint256;

    mapping(address => address) public liquidityPoolToStakingPool;
    address public rewardToken;
    Gatherer public gathererContract;
    uint256 public maxExposure; // basis points

    // deposit pools
    address public constant USDT_DEPOSIT_POOL = address(0x868277d475E0e475E38EC5CdA2d9C83B5E1D9fc8);
    address public constant USDC_DEPOSIT_POOL = address(0x16c9cF62d8daC4a38FB50Ae5fa5d51E9170F3179);
    address public constant DAI_DEPOSIT_POOL = address(0x02285AcaafEB533e03A7306C55EC031297df9224);

    // staking pools
    address public constant USDT_STAKING_POOL = address(0x324EebDAa45829c6A8eE903aFBc7B61AF48538df);
    address public constant USDC_STAKING_POOL = address(0xB71dEFDd6240c45746EC58314a01dd6D833fD3b5);
    address public constant DAI_STAKING_POOL = address(0xD2fA07cD6Cd4A5A96aa86BacfA6E50bB3aaDBA8B);

    constructor(address _registry, address _gatherer) public Modifiers(_registry) {
        setGatherer(_gatherer);
        setRewardToken(address(0x431ad2ff6a9C365805eBaD47Ee021148d6f7DBe0));
        setLiquidityPoolToStakingPool(USDT_DEPOSIT_POOL, USDT_STAKING_POOL);
        setLiquidityPoolToStakingPool(USDC_DEPOSIT_POOL, USDC_STAKING_POOL);
        setLiquidityPoolToStakingPool(DAI_DEPOSIT_POOL, DAI_STAKING_POOL);
        setMaxExposure(uint256(5000)); // 50%
    }

    function getPoolValue(address _liquidityPool, address) public view override returns (uint256) {
        return IDForceDeposit(_liquidityPool).getLiquidity();
    }

    function getDepositSomeCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        if (_amounts[0] > 0) {
            uint256 _depositAmount = _getDepositAmount(_liquidityPool, _amounts[0]);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0)));
            _codes[1] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _depositAmount));
            _codes[2] = abi.encode(_liquidityPool, abi.encodeWithSignature("mint(address,uint256)", _optyPool, _depositAmount));
        }
    }

    function getDepositAllCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyPool);
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

    function getWithdrawSomeCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_redeemAmount > 0) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                getLiquidityPoolToken(_underlyingTokens[0], _liquidityPool),
                abi.encodeWithSignature("redeem(address,uint256)", _optyPool, _redeemAmount)
            );
        }
    }

    function getWithdrawAllCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return _liquidityPool;
    }

    function getUnderlyingTokens(address _liquidityPool, address) public view override returns (address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IDForceDeposit(_liquidityPool).token();
    }

    function getAllAmountInToken(
        address payable _optyPool,
        address,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IDForceDeposit(_liquidityPool).getTokenBalance(_optyPool);
    }

    function getLiquidityPoolTokenBalance(
        address payable _optyPool,
        address,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IERC20(_liquidityPool).balanceOf(_optyPool);
    }

    function getSomeAmountInToken(
        address,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(IDForceDeposit(_liquidityPool).getExchangeRate()).div(
                10**IDForceDeposit(_liquidityPool).decimals()
            );
        }
        return _liquidityPoolTokenAmount;
    }

    function calculateAmountInLPToken(
        address,
        address _liquidityPool,
        uint256 _depositAmount
    ) public view override returns (uint256) {
        return _depositAmount.mul(10**(IDForceDeposit(_liquidityPool).decimals())).div(IDForceDeposit(_liquidityPool).getExchangeRate());
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

    function getRewardToken(address) public view override returns (address) {
        return rewardToken;
    }

    function getUnclaimedRewardTokenAmount(address payable _optyPool, address _liquidityPool) public view override returns (uint256) {
        return IDForceStake(liquidityPoolToStakingPool[_liquidityPool]).earned(_optyPool);
    }

    function getClaimRewardTokenCode(address payable, address _liquidityPool) public view override returns (bytes[] memory _codes) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_stakingPool, abi.encodeWithSignature("getReward()"));
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
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _stakeAmount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPool);
        return getStakeSomeCodes(_liquidityPool, _stakeAmount);
    }

    function getUnstakeSomeCodes(address _liquidityPool, uint256 _shares) public view override returns (bytes[] memory _codes) {
        if (_shares > 0) {
            address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
            _codes = new bytes[](1);
            _codes[0] = abi.encode(_stakingPool, abi.encodeWithSignature("withdraw(uint256)", _shares));
        }
    }

    function getUnstakeAllCodes(address payable _optyPool, address _liquidityPool) public view override returns (bytes[] memory _codes) {
        uint256 _unstakeAmount = getLiquidityPoolTokenBalanceStake(_optyPool, _liquidityPool);
        return getUnstakeSomeCodes(_liquidityPool, _unstakeAmount);
    }

    function getAllAmountInTokenStake(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        uint256 b = IERC20(_stakingPool).balanceOf(_optyPool);
        if (b > 0) {
            b = b.mul(IDForceDeposit(getLiquidityPoolToken(_underlyingToken, _liquidityPool)).getExchangeRate()).div(1e18);
        }
        uint256 _unclaimedReward = getUnclaimedRewardTokenAmount(_optyPool, _liquidityPool);
        if (_unclaimedReward > 0) {
            b = b.add(gathererContract.rewardBalanceInUnderlyingTokens(rewardToken, _underlyingToken, _unclaimedReward));
        }
        return b;
    }

    function getLiquidityPoolTokenBalanceStake(address payable _optyPool, address _liquidityPool) public view override returns (uint256) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        return IERC20(_stakingPool).balanceOf(_optyPool);
    }

    function calculateRedeemableLPTokenAmountStake(
        address payable _optyPool,
        address,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        uint256 _liquidityPoolTokenBalance = IERC20(_stakingPool).balanceOf(_optyPool);
        uint256 _balanceInTokenStake = getAllAmountInTokenStake(_optyPool, address(0), _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInTokenStake).add(1);
    }

    function isRedeemableAmountSufficientStake(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInTokenStake = getAllAmountInTokenStake(_optyPool, _underlyingToken, _liquidityPool);
        return _balanceInTokenStake >= _redeemAmount;
    }

    function getUnstakeAndWithdrawSomeCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_redeemAmount > 0) {
            _codes = new bytes[](2);
            _codes[0] = getUnstakeSomeCodes(_liquidityPool, _redeemAmount)[0];
            _codes[1] = getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _redeemAmount)[0];
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

    function setLiquidityPoolToStakingPool(address _liquidityPool, address _stakingPool) public onlyOperator {
        require(liquidityPoolToStakingPool[_liquidityPool] != _stakingPool, "liquidityPoolToStakingPool already set");
        liquidityPoolToStakingPool[_liquidityPool] = _stakingPool;
    }

    function setGatherer(address _gatherer) public onlyOperator {
        gathererContract = Gatherer(_gatherer);
    }

    function setRewardToken(address _rewardToken) public onlyOperator {
        rewardToken = _rewardToken;
    }

    function setMaxExposure(uint256 _maxExposure) public onlyOperator {
        maxExposure = _maxExposure;
    }

    function _getDepositAmount(address _liquidityPool, uint256 _amount) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 _poolValue = getPoolValue(_liquidityPool, address(0));
        uint256 _limit = (_poolValue.mul(maxExposure)).div(uint256(10000));
        if (_depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }
}
