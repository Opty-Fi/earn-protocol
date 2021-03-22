// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./OPTY.sol";
import "./OPTYMinterStorage.sol";
import "./ExponentialNoError.sol";
import "./../interfaces/ERC20/IERC20.sol";

contract OPTYMinter is OPTYMinterStorage, ExponentialNoError, Modifiers {
    constructor(address _registry, address _stakingPool) public Modifiers(_registry) {
        setStakingPool(_stakingPool);
    }

    function setStakingPool(address _stakingPool) public onlyOperator {
        require(_stakingPool != address(0), "Invalid address");
        optyStakingPool = OPTYStakingPool(_stakingPool);
    }

    function claimAndStake(address holder) public {
        uint256 _amount = claimOpty(holder, allOptyPools);
        optyStakingPool.userStake(_amount);
    }

    /**
     * @notice Claim all the OPTY accrued by holder in all markets
     * @param holder The address to claim OPTY for
     */
    function claimOpty(address holder) public returns (uint256) {
        claimOpty(holder, allOptyPools);
    }

    /**
     * @notice Claim all the OPTY accrued by holder in the specified markets
     * @param holder The address to claim OPTY for
     * @param optyTokens The list of markets to claim OPTY in
     */
    function claimOpty(address holder, address[] memory optyTokens) public returns (uint256) {
        address[] memory holders = new address[](1);
        holders[0] = holder;
        claimOpty(holders, optyTokens);
    }

    /**
     * @notice Claim all opty accrued by the holders
     * @param holders The addresses to claim OPTY for
     * @param optyTokens The list of markets to claim OPTY in
     */
    function claimOpty(address[] memory holders, address[] memory optyTokens) public returns (uint256) {
        uint256 _total;
        for (uint256 i = 0; i < optyTokens.length; i++) {
            address _optyToken = optyTokens[i];
            require(optyPoolEnabled[_optyToken], "optyPool must be enabled");
            for (uint256 j = 0; j < holders.length; j++) {
                updateSupplierRewards(address(_optyToken), holders[j]);
                uint256 _amount = div_(optyAccrued[holders[j]], 1e18);
                optyAccrued[holders[j]] = uint256(0);
                mintOpty(holders[j], _amount);
                _total = add_(_total, _amount);
            }
        }
        return _total;
    }

    /**
     * @notice Claim all the opty accrued by holder in all markets
     * @param holder The address to claim OPTY for
     */
    function claimableOpty(address holder) public view returns (uint256) {
        return claimableOpty(holder, allOptyPools);
    }

    /**
     * @notice Claim all the opty accrued by holder in the specified markets
     * @param holder The address to claim OPTY for
     * @param optyTokens The list of markets to claim OPTY in
     */
    function claimableOpty(address holder, address[] memory optyTokens) public view returns (uint256) {
        uint256 _totalOpty = optyAccrued[holder];
        for (uint256 i = 0; i < optyTokens.length; i++) {
            address _optyToken = optyTokens[i];
            if (optyPoolEnabled[_optyToken] == true) {
                uint256 _deltaSecondsUser = sub_(optyUserStateInPool[_optyToken][holder].timestamp, optyPoolStartTimestamp[_optyToken]);
                uint256 _currentOptyPoolIndex = currentOptyPoolIndex(_optyToken);
                uint256 _supplierDelta =
                    mul_(
                        IERC20(_optyToken).balanceOf(holder),
                        sub_(
                            mul_(_currentOptyPoolIndex, sub_(getBlockTimestamp(), optyPoolStartTimestamp[_optyToken])),
                            mul_(optyUserStateInPool[_optyToken][holder].index, _deltaSecondsUser)
                        )
                    );
                _totalOpty = add_(_totalOpty, _supplierDelta);
            }
        }
        return div_(_totalOpty, 1e18);
    }

    function currentOptyPoolIndex(address optyPool) public view returns (uint256) {
        uint256 _deltaSecondsSinceStart = sub_(getBlockTimestamp(), optyPoolStartTimestamp[optyPool]);
        uint256 _deltaSeconds = sub_(getBlockTimestamp(), uint256(optyPoolState[optyPool].timestamp));
        uint256 _supplyTokens = IERC20(optyPool).totalSupply();
        uint256 _optyAccrued = mul_(_deltaSeconds, optyPoolRatePerSecond[optyPool]);
        uint256 _ratio = _supplyTokens > 0 ? div_(mul_(_optyAccrued, 1e18), _supplyTokens) : uint256(0);
        uint256 _index =
            div_(
                add_(
                    mul_(optyPoolState[optyPool].index, sub_(uint256(optyPoolState[optyPool].timestamp), optyPoolStartTimestamp[optyPool])),
                    _ratio
                ),
                _deltaSecondsSinceStart
            );
        return _index;
    }

    /**
     * @notice Calculate additional accrued OPTY for a contributor since last accrual
     * @param supplier The address to calculate contributor rewards for
     */
    function updateSupplierRewards(address optyToken, address supplier) public {
        if (IERC20(optyToken).balanceOf(supplier) > 0 && lastUserUpdate[optyToken][supplier] != getBlockTimestamp()) {
            uint256 _deltaSecondsPool = sub_(getBlockTimestamp(), optyPoolStartTimestamp[optyToken]);
            uint256 _deltaSecondsUser = sub_(optyUserStateInPool[optyToken][supplier].timestamp, optyPoolStartTimestamp[optyToken]);
            uint256 _supplierTokens = IERC20(optyToken).balanceOf(supplier);
            uint256 _currentOptyPoolIndex = currentOptyPoolIndex(optyToken);
            uint256 _supplierDelta =
                mul_(
                    _supplierTokens,
                    sub_(mul_(_currentOptyPoolIndex, _deltaSecondsPool), mul_(optyUserStateInPool[optyToken][supplier].index, _deltaSecondsUser))
                );
            uint256 _supplierAccrued = add_(optyAccrued[supplier], _supplierDelta);
            optyAccrued[supplier] = _supplierAccrued;
            lastUserUpdate[optyToken][supplier] = getBlockTimestamp();
        }
    }

    function updateUserStateInPool(address optyToken, address supplier) public {
        optyUserStateInPool[optyToken][supplier].index = optyPoolState[optyToken].index;
        optyUserStateInPool[optyToken][supplier].timestamp = optyPoolState[optyToken].timestamp;
    }

    /**
     * @notice Set the OPTY rate for a specific pool
     * @return The amount of OPTY which was NOT transferred to the user
     */
    function updateOptyPoolRatePerSecondAndLPToken(address optyPool) public returns (bool) {
        optyPoolRatePerSecondAndLPToken[optyPool] = IERC20(optyPool).totalSupply() > 0
            ? div_(mul_(optyPoolRatePerSecond[optyPool], 1e18), IERC20(optyPool).totalSupply())
            : uint256(0);
        return true;
    }

    /**
     * @notice Accrue OPTY to the market by updating the supply index
     * @param optyPool The market whose supply index to update
     */
    function updateOptyPoolIndex(address optyPool) public returns (uint224) {
        if (optyPoolState[optyPool].index == uint224(0)) {
            optyPoolStartTimestamp[optyPool] = getBlockTimestamp();
            optyPoolState[optyPool].timestamp = uint32(optyPoolStartTimestamp[optyPool]);
            optyPoolState[optyPool].index = uint224(optyPoolRatePerSecondAndLPToken[optyPool]);
            return optyPoolState[optyPool].index;
        } else {
            uint256 _deltaSeconds = sub_(getBlockTimestamp(), uint256(optyPoolState[optyPool].timestamp));
            if (_deltaSeconds > 0) {
                uint256 _deltaSecondsSinceStart = sub_(getBlockTimestamp(), optyPoolStartTimestamp[optyPool]);
                uint256 _supplyTokens = IERC20(optyPool).totalSupply();
                uint256 _optyAccrued = mul_(_deltaSeconds, optyPoolRatePerSecond[optyPool]);
                uint256 _ratio = _supplyTokens > 0 ? div_(mul_(_optyAccrued, 1e18), _supplyTokens) : uint256(0);
                uint256 _index =
                    div_(
                        add_(
                            mul_(
                                optyPoolState[optyPool].index,
                                sub_(uint256(optyPoolState[optyPool].timestamp), optyPoolStartTimestamp[optyPool])
                            ),
                            _ratio
                        ),
                        _deltaSecondsSinceStart
                    );
                optyPoolState[optyPool] = OptyState({
                    index: safe224(_index, "new index exceeds 224 bits"),
                    timestamp: safe32(getBlockTimestamp(), "block number exceeds 32 bits")
                });
            }
            return optyPoolState[optyPool].index;
        }
    }

    /**
     * @notice Transfer OPTY to the user
     * @dev Note: If there is not enough OPTY, we do not perform the transfer all.
     * @param user The address of the user to transfer OPTY to
     * @param amount The amount of OPTY to (possibly) transfer
     * @return The amount of OPTY which was NOT transferred to the user
     */
    function mintOpty(address user, uint256 amount) public returns (uint256) {
        OPTY _opty = OPTY(getOptyAddress());
        require(amount > 0 && user != address(0), "Insufficient amount or invalid address");
        _opty.mint(user, amount);
        return amount;
    }

    /**
     * @notice Set the OPTY rate for a specific pool
     * @return The amount of OPTY which was NOT transferred to the user
     */
    function setOptyPoolRate(address optyPool, uint256 rate) public onlyOperator returns (bool) {
        optyPoolRatePerSecond[optyPool] = rate;
        return true;
    }

    function addOptyPool(address optyPool) public onlyOperator returns (bool) {
        for (uint256 i = 0; i < allOptyPools.length; i++) {
            require(allOptyPools[i] != optyPool, "optyPool already added");
        }
        allOptyPools.push(optyPool);
    }

    function setOptyPool(address optyPool, bool enable) public onlyOperator returns (bool) {
        optyPoolEnabled[optyPool] = enable;
        return true;
    }

    function getOptyAddress() public pure returns (address) {
        return address(0xBbc96A1676922ce6bA4366c0d30f155514E588c3);
    }

    function getBlockTimestamp() public view returns (uint256) {
        return block.timestamp;
    }
}
