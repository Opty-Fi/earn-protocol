// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IAdapter.sol";
import "../../interfaces/aave/v2/IAaveV2PriceOracle.sol";
import "../../interfaces/aave/v2/IAaveV2LendingPoolAddressesProvider.sol";
import "../../interfaces/aave/v2/IAaveV2LendingPoolAddressProviderRegistry.sol";
import "../../interfaces/aave/v2/IAaveV2.sol";
import "../../interfaces/aave/v2/IAaveV2Token.sol";
import "../../interfaces/aave/v2/IAaveV2ProtocolDataProvider.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../utils/Modifiers.sol";
import "../../utils/ERC20.sol";
import "../../HarvestCodeProvider.sol";

contract AaveV2Adapter is IAdapter, Modifiers {
    using SafeMath for uint256;

    HarvestCodeProvider public harvestCodeProviderContract;

    uint256 public maxExposure; // basis points

    uint256 public healthFactor = 2;
    uint256 public ltv = 65;
    uint256 public max = 100;
    bytes32 public constant protocolDataProviderId = 0x0100000000000000000000000000000000000000000000000000000000000000;

    constructor(address _registry, address _harvestCodeProvider) public Modifiers(_registry) {
        setHarvestCodeProvider(_harvestCodeProvider);
        setMaxExposure(uint256(5000)); // 50%
    }

    function getPoolValue(address _liquidityPoolAddressProviderRegistry, address _underlyingToken) public view override returns (uint256) {
        return _getReserveData(_liquidityPoolAddressProviderRegistry, _underlyingToken).availableLiquidity;
    }

    function getDepositSomeCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProviderRegistry,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        if (_amounts[0] > 0) {
            address _lendingPool = _getLendingPool(_liquidityPoolAddressProviderRegistry);
            uint256 _depositAmount = _getDepositAmount(_liquidityPoolAddressProviderRegistry, _underlyingTokens[0], _amounts[0]);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _lendingPool, uint256(0)));
            _codes[1] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _lendingPool, _depositAmount));
            _codes[2] = abi.encode(
                _lendingPool,
                abi.encodeWithSignature("deposit(address,uint256,address,uint16)", _underlyingTokens[0], _depositAmount, _optyVault, uint16(0))
            );
        }
    }

    function getDepositAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProviderRegistry
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyVault);
        return getDepositSomeCodes(_optyVault, _underlyingTokens, _liquidityPoolAddressProviderRegistry, _amounts);
    }

    function getBorrowAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProviderRegistry,
        address _outputToken
    ) public view override returns (bytes[] memory _codes) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProviderRegistry);
        ReserveConfigurationData memory _reserveConfigurationData =
            IAaveV2ProtocolDataProvider(_getProtocolDataProvider(_liquidityPoolAddressProviderRegistry)).getReserveConfigurationData(
                _underlyingTokens[0]
            );
        if (
            _reserveConfigurationData.usageAsCollateralEnabled &&
            _reserveConfigurationData.stableBorrowRateEnabled &&
            _reserveConfigurationData.borrowingEnabled &&
            _reserveConfigurationData.isActive &&
            !_reserveConfigurationData.isFrozen
        ) {
            uint256 _borrow = _availableToBorrowReserve(_optyVault, _liquidityPoolAddressProviderRegistry, _outputToken);
            if (_borrow > 0) {
                bool _isUserCollateralEnabled =
                    _getUserReserveData(_liquidityPoolAddressProviderRegistry, _underlyingTokens[0], _optyVault).usageAsCollateralEnabled;
                if (_isUserCollateralEnabled) {
                    _codes = new bytes[](1);
                    _codes[0] = abi.encode(
                        _lendingPool,
                        abi.encodeWithSignature(
                            "borrow(address,uint256,uint256,uint16,address)",
                            _outputToken,
                            _borrow,
                            uint256(1),
                            uint16(0),
                            _optyVault
                        )
                    );
                } else {
                    _codes = new bytes[](2);
                    _codes[0] = abi.encode(
                        _lendingPool,
                        abi.encodeWithSignature("setUserUseReserveAsCollateral(address,bool)", _underlyingTokens[0], true)
                    );
                    _codes[1] = abi.encode(
                        _lendingPool,
                        abi.encodeWithSignature(
                            "borrow(address,uint256,uint256,uint16,address)",
                            _outputToken,
                            _borrow,
                            uint256(1),
                            uint16(0),
                            _optyVault
                        )
                    );
                }
            }
        } else {
            revert("!borrow");
        }
    }

    function getRepayAndWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProviderRegistry,
        address _outputToken
    ) public view override returns (bytes[] memory _codes) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProviderRegistry);
        uint256 _liquidityPoolTokenBalance =
            getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPoolAddressProviderRegistry);

        // // borrow token amount
        uint256 _borrowAmount = IERC20(_outputToken).balanceOf(_optyVault);

        uint256 _aTokenAmount =
            _maxWithdrawal(_optyVault, _liquidityPoolAddressProviderRegistry, _liquidityPoolTokenBalance, _outputToken, _borrowAmount);

        uint256 _outputTokenRepayable =
            _over(_optyVault, _underlyingTokens[0], _liquidityPoolAddressProviderRegistry, _outputToken, _aTokenAmount);

        if (_outputTokenRepayable > 0) {
            if (_outputTokenRepayable > _borrowAmount) {
                _outputTokenRepayable = _borrowAmount;
            }
            if (_outputTokenRepayable > 0) {
                address _liquidityPoolToken = getLiquidityPoolToken(_underlyingTokens[0], _liquidityPoolAddressProviderRegistry);
                _codes = new bytes[](6);
                _codes[0] = abi.encode(_outputToken, abi.encodeWithSignature("approve(address,uint256)", _lendingPool, uint256(0)));
                _codes[1] = abi.encode(_outputToken, abi.encodeWithSignature("approve(address,uint256)", _lendingPool, _borrowAmount));
                _codes[2] = abi.encode(
                    _lendingPool,
                    abi.encodeWithSignature("repay(address,uint256,uint256,address)", _outputToken, _borrowAmount, uint256(1), _optyVault)
                );
                _codes[3] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _lendingPool, uint256(0)));
                _codes[4] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _lendingPool, _aTokenAmount));
                _codes[5] = abi.encode(
                    _lendingPool,
                    abi.encodeWithSignature("withdraw(address,uint256,address)", _underlyingTokens[0], _aTokenAmount, _optyVault)
                );
            }
        }
    }

    function getWithdrawSomeCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProviderRegistry,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        if (_amount > 0) {
            address _lendingPool = _getLendingPool(_liquidityPoolAddressProviderRegistry);
            address _liquidityPoolToken = getLiquidityPoolToken(_underlyingTokens[0], _liquidityPoolAddressProviderRegistry);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _lendingPool, uint256(0)));
            _codes[1] = abi.encode(_liquidityPoolToken, abi.encodeWithSignature("approve(address,uint256)", _lendingPool, _amount));
            _codes[2] = abi.encode(
                _lendingPool,
                abi.encodeWithSignature("withdraw(address,uint256,address)", _underlyingTokens[0], _amount, _optyVault)
            );
        }
    }

    function getWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProviderRegistry
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPoolAddressProviderRegistry);
        return getWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPoolAddressProviderRegistry, _redeemAmount);
    }

    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPoolAddressProviderRegistry)
        public
        view
        override
        returns (address)
    {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProviderRegistry);
        ReserveData memory _reserveData = IAaveV2(_lendingPool).getReserveData(_underlyingToken);
        return _reserveData.aTokenAddress;
    }

    function getUnderlyingTokens(address, address _liquidityPoolToken) public view override returns (address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IAaveV2Token(_liquidityPoolToken).UNDERLYING_ASSET_ADDRESS();
    }

    function getAllAmountInToken(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProviderRegistry
    ) public view override returns (uint256) {
        return getLiquidityPoolTokenBalance(_optyVault, _underlyingToken, _liquidityPoolAddressProviderRegistry);
    }

    function getLiquidityPoolTokenBalance(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProviderRegistry
    ) public view override returns (uint256) {
        return IERC20(getLiquidityPoolToken(_underlyingToken, _liquidityPoolAddressProviderRegistry)).balanceOf(_optyVault);
    }

    function getSomeAmountInToken(
        address,
        address,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        return _liquidityPoolTokenAmount;
    }

    function getSomeAmountInTokenBorrow(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProviderRegistry,
        uint256 _liquidityPoolTokenBalance,
        address _borrowToken,
        uint256 _borrowAmount
    ) public view override returns (uint256) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProviderRegistry);
        uint256 _aTokenAmount = _maxWithdrawal(_optyVault, _lendingPool, _liquidityPoolTokenBalance, _borrowToken, _borrowAmount);
        uint256 _outputTokenRepayable = _over(_optyVault, _underlyingToken, _liquidityPoolAddressProviderRegistry, _borrowToken, _aTokenAmount);
        if (_outputTokenRepayable > _borrowAmount) {
            return _aTokenAmount;
        } else {
            return
                _aTokenAmount.add(
                    harvestCodeProviderContract.getOptimalTokenAmount(_borrowToken, _underlyingToken, _borrowAmount.sub(_outputTokenRepayable))
                );
        }
    }

    function getAllAmountInTokenBorrow(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProviderRegistry,
        address _borrowToken,
        uint256 _borrowAmount
    ) public view override returns (uint256) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyVault, _underlyingToken, _liquidityPoolAddressProviderRegistry);
        return
            getSomeAmountInTokenBorrow(
                _optyVault,
                _underlyingToken,
                _liquidityPoolAddressProviderRegistry,
                _liquidityPoolTokenBalance,
                _borrowToken,
                _borrowAmount
            );
    }

    function calculateAmountInLPToken(
        address,
        address,
        uint256 _underlyingTokenAmount
    ) public view override returns (uint256) {
        return _underlyingTokenAmount;
    }

    function calculateRedeemableLPTokenAmount(
        address payable,
        address,
        address,
        uint256 _redeemAmount
    ) public view override returns (uint256) {
        return _redeemAmount;
    }

    function isRedeemableAmountSufficient(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProviderRegistry,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyVault, _underlyingToken, _liquidityPoolAddressProviderRegistry);
        return _balanceInToken >= _redeemAmount;
    }

    function getRewardToken(address) public view override returns (address) {
        return address(0);
    }

    function getUnclaimedRewardTokenAmount(address payable, address) public view override returns (uint256) {
        revert("!empty");
    }

    function getClaimRewardTokenCode(address payable, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getHarvestSomeCodes(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getHarvestAllCodes(
        address payable,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function canStake(address) public view override returns (bool) {
        return false;
    }

    function getStakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getStakeAllCodes(
        address payable,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeAllCodes(address payable, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getAllAmountInTokenStake(
        address payable,
        address,
        address
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function getLiquidityPoolTokenBalanceStake(address payable, address) public view override returns (uint256) {
        revert("!empty");
    }

    function calculateRedeemableLPTokenAmountStake(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function isRedeemableAmountSufficientStake(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (bool) {
        revert("!empty");
    }

    function getUnstakeAndWithdrawSomeCodes(
        address payable,
        address[] memory,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeAndWithdrawAllCodes(
        address payable,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function setHarvestCodeProvider(address _harvestCodeProvider) public onlyOperator {
        harvestCodeProviderContract = HarvestCodeProvider(_harvestCodeProvider);
    }

    function setMaxExposure(uint256 _maxExposure) public onlyOperator {
        maxExposure = _maxExposure;
    }

    function _getLendingPool(address _lendingPoolAddressProviderRegistry) internal view returns (address) {
        return IAaveV2LendingPoolAddressesProvider(_getLendingPoolAddressProvider(_lendingPoolAddressProviderRegistry)).getLendingPool();
    }

    function _getPriceOracle(address _lendingPoolAddressProviderRegistry) internal view returns (address) {
        return IAaveV2LendingPoolAddressesProvider(_getLendingPoolAddressProvider(_lendingPoolAddressProviderRegistry)).getPriceOracle();
    }

    function _getDepositAmount(
        address _liquidityPoolAddressProviderRegistry,
        address _underlyingToken,
        uint256 _amount
    ) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 _poolValue = getPoolValue(_liquidityPoolAddressProviderRegistry, _underlyingToken);
        uint256 _limit = (_poolValue.mul(maxExposure)).div(uint256(10000));
        if (_depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }

    function _maxSafeETH(address _optyVault, address _liquidityPoolAddressProviderRegistry)
        internal
        view
        returns (
            uint256 maxBorrowsETH,
            uint256 totalBorrowsETH,
            uint256 availableBorrowsETH
        )
    {
        UserAccountData memory _userAccountData = IAaveV2(_getLendingPool(_liquidityPoolAddressProviderRegistry)).getUserAccountData(_optyVault);
        uint256 _totalBorrowsETH = _userAccountData.totalDebtETH;
        uint256 _availableBorrowsETH = _userAccountData.availableBorrowsETH;
        uint256 _maxBorrowETH = (_totalBorrowsETH.add(_availableBorrowsETH));
        return (_maxBorrowETH.div(healthFactor), _totalBorrowsETH, _availableBorrowsETH);
    }

    function _availableToBorrowETH(address _optyVault, address _liquidityPoolAddressProviderRegistry) internal view returns (uint256) {
        (uint256 _maxSafeETH_, uint256 _totalBorrowsETH, uint256 _availableBorrowsETH) =
            _maxSafeETH(_optyVault, _liquidityPoolAddressProviderRegistry);
        _maxSafeETH_ = _maxSafeETH_.mul(95).div(100); // 5% buffer so we don't go into a earn/rebalance loop
        if (_maxSafeETH_ > _totalBorrowsETH) {
            return _availableBorrowsETH.mul(_maxSafeETH_.sub(_totalBorrowsETH)).div(_availableBorrowsETH);
        } else {
            return 0;
        }
    }

    function _getReservePrice(address _liquidityPoolAddressProviderRegistry, address _token) internal view returns (uint256) {
        return _getReservePriceETH(_liquidityPoolAddressProviderRegistry, _token);
    }

    function _getReservePriceETH(address _liquidityPoolAddressProviderRegistry, address _token) internal view returns (uint256) {
        return IAaveV2PriceOracle(_getPriceOracle(_liquidityPoolAddressProviderRegistry)).getAssetPrice(_token);
    }

    function _availableToBorrowReserve(
        address _optyVault,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) internal view returns (uint256) {
        uint256 _available = _availableToBorrowETH(_optyVault, _liquidityPoolAddressProvider);
        if (_available > 0) {
            return
                _available.mul(uint256(10)**ERC20(_outputToken).decimals()).div(
                    _getReservePrice(_liquidityPoolAddressProvider, _outputToken)
                );
        } else {
            return 0;
        }
    }

    function _getUnderlyingPrice(address _liquidityPoolAddressProviderRegistry, address _underlyingToken) internal view returns (uint256) {
        return _getReservePriceETH(_liquidityPoolAddressProviderRegistry, _underlyingToken);
    }

    function _getUnderlyingPriceETH(
        address _underlyingToken,
        address _liquidityPoolAddressProviderRegistry,
        uint256 _amount
    ) internal view returns (uint256) {
        address _liquidityPoolToken = getLiquidityPoolToken(_underlyingToken, _liquidityPoolAddressProviderRegistry);
        _amount = _amount.mul(_getUnderlyingPrice(_liquidityPoolAddressProviderRegistry, _underlyingToken)).div(
            uint256(10)**ERC20(address(_liquidityPoolToken)).decimals()
        ); // Calculate the amount we are withdrawing in ETH
        return _amount.mul(ltv).div(max).div(healthFactor);
    }

    function _over(
        address _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProviderRegistry,
        address _outputToken,
        uint256 _amount
    ) internal view returns (uint256) {
        uint256 _eth = _getUnderlyingPriceETH(_underlyingToken, _liquidityPoolAddressProviderRegistry, _amount);
        (uint256 _maxSafeETH_, uint256 _totalBorrowsETH, ) = _maxSafeETH(_optyVault, _liquidityPoolAddressProviderRegistry);
        _maxSafeETH_ = _maxSafeETH_.mul(105).div(100); // 5% buffer so we don't go into a earn/rebalance loop
        if (_eth > _maxSafeETH_) {
            _maxSafeETH_ = 0;
        } else {
            _maxSafeETH_ = _maxSafeETH_.sub(_eth); // Add the ETH we are withdrawing
        }
        if (_maxSafeETH_ < _totalBorrowsETH) {
            uint256 _over_ = _totalBorrowsETH.mul(_totalBorrowsETH.sub(_maxSafeETH_)).div(_totalBorrowsETH);
            _over_ = _over_.mul(uint256(10)**ERC20(_outputToken).decimals()).div(
                _getReservePrice(_liquidityPoolAddressProviderRegistry, _outputToken)
            );
            return _over_;
        } else {
            return 0;
        }
    }

    function _getUserReserveData(
        address _liquidityPoolAddressProviderRegistry,
        address _underlyingToken,
        address _optyVault
    ) internal view returns (UserReserveData memory) {
        return
            IAaveV2ProtocolDataProvider(_getProtocolDataProvider(_liquidityPoolAddressProviderRegistry)).getUserReserveData(
                _underlyingToken,
                _optyVault
            );
    }

    function _getReserveData(address _liquidityPoolAddressProviderRegistry, address _underlyingToken)
        internal
        view
        returns (ReserveDataProtocol memory)
    {
        return IAaveV2ProtocolDataProvider(_getProtocolDataProvider(_liquidityPoolAddressProviderRegistry)).getReserveData(_underlyingToken);
    }

    function _debt(
        address _optyVault,
        address _liquidityPoolAddressProviderRegistry,
        address _outputToken
    ) internal view returns (uint256) {
        return
            IAaveV2ProtocolDataProvider(_getProtocolDataProvider(_liquidityPoolAddressProviderRegistry))
                .getUserReserveData(_outputToken, _optyVault)
                .currentStableDebt;
    }

    // % of tokens locked and cannot be withdrawn per user
    // this is impermanent locked, unless the debt out accrues the strategy
    function _locked(
        address _optyVault,
        address _liquidityPoolAddressProviderRegistry,
        address _borrowToken,
        uint256 _borrowAmount
    ) internal view returns (uint256) {
        return _borrowAmount.mul(1e18).div(_debt(_optyVault, _liquidityPoolAddressProviderRegistry, _borrowToken));
    }

    // Calculates in impermanent lock due to debt
    function _maxWithdrawal(
        address _optyVault,
        address _liquidityPoolAddressProviderRegistry,
        uint256 _aTokenAmount,
        address _borrowToken,
        uint256 _borrowAmount
    ) internal view returns (uint256) {
        uint256 _safeWithdraw =
            _aTokenAmount.mul(_locked(_optyVault, _liquidityPoolAddressProviderRegistry, _borrowToken, _borrowAmount)).div(1e18);
        if (_safeWithdraw > _aTokenAmount) {
            return _aTokenAmount;
        } else {
            uint256 _diff = _aTokenAmount.sub(_safeWithdraw);
            return _aTokenAmount.sub(_diff.mul(healthFactor)); // technically 150%, not 200%, but adding buffer
        }
    }

    function _getLendingPoolAddressProvider(address _liquidityPoolAddressProviderRegistry) internal view returns (address) {
        return IAaveV2LendingPoolAddressProviderRegistry(_liquidityPoolAddressProviderRegistry).getAddressesProvidersList()[0];
    }

    function _getProtocolDataProvider(address _liquidityPoolAddressProviderRegistry) internal view returns (address) {
        return
            IAaveV2LendingPoolAddressesProvider(_getLendingPoolAddressProvider(_liquidityPoolAddressProviderRegistry)).getAddress(
                protocolDataProviderId
            );
    }
}
