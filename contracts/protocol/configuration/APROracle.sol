pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { SafeERC20, IERC20, SafeMath, Address } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { Modifiers } from "./Modifiers.sol";

// Compound
interface Compound {
    enum PriceSource {
        FIXED_ETH, /// implies the fixedPrice is a constant multiple of the ETH price (which varies)
        FIXED_USD, /// implies the fixedPrice is a constant multiple of the USD price (which is 1)
        REPORTER /// implies the price is set by the reporter
    }
    struct TokenConfig {
        address cToken;
        address underlying;
        bytes32 symbolHash;
        uint256 baseUnit;
        PriceSource priceSource;
        uint256 fixedPrice;
        address uniswapMarket;
        bool isUniswapReversed;
    }

    function interestRateModel() external view returns (address);

    function reserveFactorMantissa() external view returns (uint256);

    function totalBorrows() external view returns (uint256);

    function totalReserves() external view returns (uint256);

    function getTokenConfigByUnderlying(address) external view returns (TokenConfig memory);

    function supplyRatePerBlock() external view returns (uint256);

    function getCash() external view returns (uint256);
}

interface LendingPoolAddressesProviderV1 {
    function getLendingPoolCore() external view returns (address);
}

interface LendingPoolAddressesProviderV2 {
    function getLendingPool() external view returns (address);
}

interface LendingPoolCore {
    function getReserveCurrentLiquidityRate(address _reserve) external view returns (uint256 liquidityRate);

    function getReserveATokenAddress(address _reserve) external view returns (address);

    function getReserveInterestRateStrategyAddress(address _reserve) external view returns (address);

    function getReserveTotalBorrows(address _reserve) external view returns (uint256);

    function getReserveTotalBorrowsStable(address _reserve) external view returns (uint256);

    function getReserveTotalBorrowsVariable(address _reserve) external view returns (uint256);

    function getReserveCurrentAverageStableBorrowRate(address _reserve) external view returns (uint256);

    function getReserveAvailableLiquidity(address _reserve) external view returns (uint256);
}

interface DataProvider {
    function getReserveData(address token)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint40
        );
}

interface LendingPool {
    struct ReserveConfigurationMap {
        //bit 0-15: LTV
        //bit 16-31: Liq. threshold
        //bit 32-47: Liq. bonus
        //bit 48-55: Decimals
        //bit 56: Reserve is active
        //bit 57: reserve is frozen
        //bit 58: borrowing is enabled
        //bit 59: stable rate borrowing enabled
        //bit 60-63: reserved
        //bit 64-79: reserve factor
        uint256 data;
    }

    function getReserveData(address _reserve)
        external
        view
        returns (
            ReserveConfigurationMap memory,
            uint128,
            uint128,
            uint128,
            uint128,
            uint128,
            uint40,
            address,
            address,
            address,
            address,
            uint8
        );
}

interface IReserveInterestRateStrategyV1 {
    function calculateInterestRates(
        address _reserve,
        uint256 _utilizationRate,
        uint256 _totalBorrowsStable,
        uint256 _totalBorrowsVariable,
        uint256 _averageStableBorrowRate
    )
        external
        view
        returns (
            uint256 liquidityRate,
            uint256 stableBorrowRate,
            uint256 variableBorrowRate
        );
}

interface IReserveInterestRateStrategyV2 {
    function calculateInterestRates(
        address _reserve,
        uint256 _utilizationRate,
        uint256 _totalBorrowsStable,
        uint256 _totalBorrowsVariable,
        uint256 _averageStableBorrowRate,
        uint256 _reserveFactor
    )
        external
        view
        returns (
            uint256 liquidityRate,
            uint256 stableBorrowRate,
            uint256 variableBorrowRate
        );
}

interface InterestRateModel {
    function getSupplyRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves,
        uint256 reserveFactorMantissa
    ) external view returns (uint256);
}

/*
 * @author OptyFi inspired on yearn.finance APROracle contract
 */
contract APROracle is Modifiers {
    using SafeMath for uint256;
    using Address for address;

    uint256 public constant DECIMAL = 10**18;
    bytes32 public constant ZERO_BYTES32 = 0x0000000000000000000000000000000000000000000000000000000000000000;

    address public aaveV1;
    address public aaveV2AddressProvider;
    address public compound;

    uint256 public dydxModifier;
    uint256 public blocksPerYear;

    constructor(address _registry) public Modifiers(_registry) {
        aaveV1 = address(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8);
        aaveV2AddressProvider = address(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
        compound = address(0x922018674c12a7F0D394ebEEf9B58F186CdE13c1);
        // 3153600 seconds div 13 second blocks
        blocksPerYear = 242584;
    }

    function setNewAaveV1(address _newAaveV1) public onlyOperator {
        aaveV1 = _newAaveV1;
    }

    function setNewBlocksPerYear(uint256 _newBlocksPerYear) public onlyOperator {
        blocksPerYear = _newBlocksPerYear;
    }

    function getCompoundAPR(address token) public view returns (uint256) {
        return Compound(token).supplyRatePerBlock().mul(blocksPerYear);
    }

    function getAaveV1APR(address token) public view returns (address, uint256) {
        LendingPoolCore core = LendingPoolCore(LendingPoolAddressesProviderV1(aaveV1).getLendingPoolCore());
        address aToken = core.getReserveATokenAddress(token);
        return (aToken, core.getReserveCurrentLiquidityRate(token).div(1e9));
    }

    function getAaveV2APR(address token) public view returns (address, uint256) {
        LendingPool lendingPool = LendingPool(LendingPoolAddressesProviderV2(aaveV2AddressProvider).getLendingPool());
        (, , , uint128 liquidityRate, , , , address aToken, , , , ) = lendingPool.getReserveData(token);
        return (aToken, uint256(liquidityRate).div(1e9));
    }

    function getBestAPR(bytes32 _tokensHash) public view returns (bytes32) {
        address[] memory tokens = registryContract.getTokensHashToTokens(_tokensHash);
        uint256 aaveV2APR;
        address aTokenV2;
        (aTokenV2, aaveV2APR) = getAaveV2APR(tokens[0]);
        uint256 aaveV1APR;
        address aToken;
        (aToken, aaveV1APR) = getAaveV1APR(tokens[0]);
        uint256 compoundAPR;
        address cToken;
        bytes32 stepsHash;
        bytes32 bestStrategyHash;
        try Compound(compound).getTokenConfigByUnderlying(tokens[0]) returns (Compound.TokenConfig memory tokenConfig) {
            cToken = tokenConfig.cToken;
            compoundAPR = getCompoundAPR(cToken);
        } catch {
            cToken = address(0);
            compoundAPR = uint256(0);
        }
        if (aaveV1APR == uint256(0) && aaveV2APR == uint256(0) && compoundAPR == uint256(0)) {
            return ZERO_BYTES32;
        } else {
            if (aaveV1APR > compoundAPR) {
                if (aaveV1APR > aaveV2APR) {
                    stepsHash = keccak256(abi.encodePacked(aToken, aToken, false));
                } else {
                    stepsHash = keccak256(abi.encodePacked(aTokenV2, aTokenV2, false));
                }
            } else {
                if (compoundAPR > aaveV2APR) {
                    stepsHash = keccak256(abi.encodePacked(cToken, cToken, false));
                } else {
                    stepsHash = keccak256(abi.encodePacked(aTokenV2, aTokenV2, false));
                }
            }
            bestStrategyHash = keccak256(abi.encodePacked(_tokensHash, stepsHash));
            return bestStrategyHash;
        }
    }

    // incase of half-way error
    function inCaseTokenGetsStuck(IERC20 _tokenAddress) public onlyOperator {
        uint256 qty = _tokenAddress.balanceOf(address(this));
        _tokenAddress.transfer(msg.sender, qty);
    }

    // incase of half-way error
    function inCaseETHGetsStuck() public onlyOperator {
        /* solhint-disable avoid-low-level-calls */
        (bool result, ) = msg.sender.call{ value: address(this).balance }("");
        /* solhint-disable avoid-low-level-calls */
        require(result, "transfer of ETH failed");
    }
}
