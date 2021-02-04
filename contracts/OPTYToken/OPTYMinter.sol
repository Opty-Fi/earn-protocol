// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./OPTY.sol";
import "./OPTYMinterStorage.sol";
import "./ExponentialNoError.sol";
import "./../interfaces/ERC20/IERC20.sol";


contract OPTYMinter is OPTYMinterStorage, ExponentialNoError {
    
    constructor() public {
        genesisBlock = getBlockNumber();
    }
    
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
            updateOptyPoolIndex(_optyToken);
            for (uint j = 0; j < holders.length; j++) {
                distributeSupplierOpty(address(_optyToken), holders[j]);
                uint _amount = optyAccrued[holders[j]];
                optyAccrued[holders[j]] = uint(0);
                mintOpty(holders[j], _amount);
            }
        }
    }
    
    /**
     * @notice Calculate OPTY accrued by a supplier and possibly transfer it to them
     * @param optyToken The market in which the supplier is interacting
     * @param supplier The address of the supplier to distribute OPTY to
     */
    function distributeSupplierOpty(address optyToken, address supplier) internal {
        OptyState storage _optyPoolState = optyPoolState[optyToken];
        uint _optyPoolIndex = _optyPoolState.index;
        uint _userIndex = uint(optyUserStateInPool[optyToken][supplier].index);
        optyUserStateInPool[optyToken][supplier].index = uint224(_optyPoolIndex);
        uint _deltaBlocksPool = sub_(getBlockNumber(),genesisBlock);
        uint _deltaBlocksUser = sub_(getBlockNumber(),optyUserStateInPool[optyToken][supplier].block);
        optyUserStateInPool[optyToken][supplier].block = uint32(getBlockNumber());
        uint _supplierTokens = IERC20(optyToken).balanceOf(supplier);
        uint _supplierDelta = mul_(_supplierTokens, sub_(mul_(_optyPoolIndex,_deltaBlocksPool),mul_(_userIndex,_deltaBlocksUser)));
        uint _supplierAccrued = add_(optyAccrued[supplier], _supplierDelta);
        optyAccrued[supplier] = _supplierAccrued;
    }
    
    /**
     * @notice Accrue OPTY to the market by updating the supply index
     * @param optyPool The market whose supply index to update
     */
    function updateOptyPoolIndex(address optyPool) internal {
        OptyState storage _optyPoolState = optyPoolState[optyPool];
        uint _supplySpeed = optyPoolRate[optyPool];
        uint _blockNumber = getBlockNumber();
        uint _deltaBlocks = sub_(_blockNumber, uint(_optyPoolState.block));
        uint _deltaBlocksSinceDeployment = sub_(_blockNumber, genesisBlock);
        if (_deltaBlocks > 0 && _supplySpeed > 0) {
            uint _supplyTokens = IERC20(optyPool).totalSupply();
            uint _optyAccrued = mul_(_deltaBlocks, _supplySpeed);
            uint ratio = _supplyTokens > 0 ? div_(_optyAccrued, _supplyTokens) : uint(0);
            uint index = div_(add_(mul_(_optyPoolState.index,_deltaBlocksSinceDeployment),ratio),(_deltaBlocksSinceDeployment+1));
            optyPoolState[optyPool] = OptyState({
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
    function mintOpty(address user, uint amount) internal returns (uint) {
        OPTY _opty = OPTY(getOptyAddress());
        require(amount > 0 && user != address(0), "Insufficient amount or invalid address");
        _opty.mint(user,amount);
        return amount;
    }
    
    function getOptyAddress() public pure returns (address) {
        return address(0);
    }
    
    function getBlockNumber() public view returns (uint) {
        return block.number;
    }
}