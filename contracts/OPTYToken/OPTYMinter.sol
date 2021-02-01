// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./OPTY.sol";
import "./OPTYMinterStorage.sol";
import "./ExponentialNoError.sol";
import "./../interfaces/ERC20/IERC20.sol";


contract OPTYMinter is OPTYMinterStorage, ExponentialNoError {
    
    /// @notice The initial OPTY index for a market
    uint256 public constant optyInitialIndex = 1e36;
    
    /**
     * @notice Claim all the opty accrued by holder in all markets
     * @param holder The address to claim OPTY for
     */
    function claimOpty(address holder) public {
        return claimOpty(holder, allOptyPools);
    }

    /**
     * @notice Claim all the opty accrued by holder in the specified markets
     * @param holder The address to claim OPTY for
     * @param optyTokens The list of markets to claim OPTY in
     */
    function claimOpty(address holder, address[] memory optyTokens) public {
        address[] memory holders = new address[](1);
        holders[0] = holder;
        claimOpty(holders, optyTokens);
    }

    /**
     * @notice Claim all opty accrued by the holders
     * @param holders The addresses to claim OPTY for
     * @param optyTokens The list of markets to claim OPTY in
     */
    function claimOpty(address[] memory holders, address[] memory optyTokens) public {
        for (uint i = 0; i < optyTokens.length; i++) {
            address _optyToken = optyTokens[i];
            require(marketEnabled[_optyToken], "market must be enabled");
            updateCompSupplyIndex(_optyToken);
            for (uint j = 0; j < holders.length; j++) {
                distributeSupplierComp(address(_optyToken), holders[j]);
                optyAccrued[holders[j]] = grantCompInternal(holders[j], optyAccrued[holders[j]]);
            }
        }
    }
    
    /**
     * @notice Calculate OPTY accrued by a supplier and possibly transfer it to them
     * @param optyToken The market in which the supplier is interacting
     * @param supplier The address of the supplier to distribute OPTY to
     */
    function distributeSupplierComp(address optyToken, address supplier) internal {
        OptyPoolState storage _optyPoolState = optyPoolState[optyToken];
        uint _optyPoolIndex = _optyPoolState.index;
        uint _userIndex = optySupplierIndex[optyToken][supplier];
        optySupplierIndex[optyToken][supplier] = _optyPoolIndex;

        if (_userIndex == 0 && _optyPoolIndex > 0) {
            _userIndex = optyInitialIndex;
        }

        uint _deltaIndex = sub_(_optyPoolIndex, _userIndex);
        uint _supplierTokens = IERC20(optyToken).balanceOf(supplier);
        uint _supplierDelta = mul_(_supplierTokens, _deltaIndex);
        uint _supplierAccrued = add_(optyAccrued[supplier], _supplierDelta);
        optyAccrued[supplier] = _supplierAccrued;
    }
    
    /**
     * @notice Accrue OPTY to the market by updating the supply index
     * @param optyToken The market whose supply index to update
     */
    function updateCompSupplyIndex(address optyToken) internal {
        OptyPoolState storage _optyPoolState = optyPoolState[optyToken];
        uint _supplySpeed = optySpeeds[optyToken];
        uint _blockNumber = getBlockNumber();
        uint _deltaBlocks = sub_(_blockNumber, uint(_optyPoolState.block));
        if (_deltaBlocks > 0 && _supplySpeed > 0) {
            uint _supplyTokens = IERC20(optyToken).totalSupply();
            uint _optyAccrued = mul_(_deltaBlocks, _supplySpeed);
            uint ratio = _supplyTokens > 0 ? div_(_optyAccrued, _supplyTokens) : uint(0);
            uint index = add_(_optyPoolState.index, ratio);
            optyPoolState[optyToken] = OptyPoolState({
                index: safe224(index, "new index exceeds 224 bits"),
                block: safe32(_blockNumber, "block number exceeds 32 bits")
            });
        } else if (_deltaBlocks > 0) {
            _optyPoolState.block = safe32(_blockNumber, "block number exceeds 32 bits");
        }
    }
    
    /**
     * @notice Transfer OPTY to the user
     * @dev Note: If there is not enough OPTY, we do not perform the transfer all.
     * @param user The address of the user to transfer OPTY to
     * @param amount The amount of OPTY to (possibly) transfer
     * @return The amount of OPTY which was NOT transferred to the user
     */
    function grantCompInternal(address user, uint amount) internal returns (uint) {
        OPTY _opty = OPTY(getOptyAddress());
        uint _optyRemaining = _opty.balanceOf(address(this));
        if (amount > 0 && amount <= _optyRemaining) {
            _opty.transfer(user, amount);
            return 0;
        }
        return amount;
    }
    
    function getOptyAddress() public pure returns (address) {
        return address(0);
    }
    
    function getBlockNumber() public view returns (uint) {
        return block.number;
    }
}