// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./OPTY.sol";
import "./OPTYMinterStorage.sol";
import "./ExponentialNoError.sol";
import "./../interfaces/ERC20/IERC20.sol";


<<<<<<< HEAD
contract OPTYMinter is OPTYMinterStorage, ExponentialNoError {
    
    constructor() public {
        genesisBlock = getBlockNumber();
=======
contract OPTYMinter is OPTYMinterStorage, ExponentialNoError, Modifiers {
    
    constructor(address _registry) public Modifiers(_registry) {
>>>>>>> OP-291
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
<<<<<<< HEAD
            require(marketEnabled[_optyToken], "market must be enabled");
            updateOptyPoolIndex(_optyToken);
            for (uint j = 0; j < holders.length; j++) {
                distributeSupplierOpty(address(_optyToken), holders[j]);
                uint _amount = optyAccrued[holders[j]];
=======
            require(optyPoolEnabled[_optyToken], "optyPool must be enabled");
            for (uint j = 0; j < holders.length; j++) {
                updateSupplierRewards(address(_optyToken), holders[j]);
                uint _amount = div_(optyAccrued[holders[j]], 1e18);
>>>>>>> OP-291
                optyAccrued[holders[j]] = uint(0);
                mintOpty(holders[j], _amount);
            }
        }
    }
<<<<<<< HEAD
    
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
=======

    /**
     * @notice Claim all the opty accrued by holder in all markets
     * @param holder The address to claim OPTY for
     */
    function claimableOpty(address holder) public view returns(uint) {
        return claimableOpty(holder, allOptyPools);
    }

    /**
     * @notice Claim all the opty accrued by holder in the specified markets
     * @param holder The address to claim OPTY for
     * @param optyTokens The list of markets to claim OPTY in
     */
    function claimableOpty(address holder, address[] memory optyTokens) public view returns(uint) {
        uint _totalOpty = optyAccrued[holder];
        for (uint i = 0; i < optyTokens.length; i++) {
            address _optyToken = optyTokens[i];
            if(optyPoolEnabled[_optyToken] == true) {
                uint _deltaBlocksPool = sub_(getBlockNumber(),optyPoolStartBlock[_optyToken]);
                uint _deltaBlocksUser = sub_(optyUserStateInPool[_optyToken][holder].block,optyPoolStartBlock[_optyToken]);
                uint _supplierDelta = mul_(IERC20(_optyToken).balanceOf(holder), sub_(mul_(uint(optyPoolState[_optyToken].index),_deltaBlocksPool),mul_(optyUserStateInPool[_optyToken][holder].index,_deltaBlocksUser)));
                _totalOpty = add_(_totalOpty, _supplierDelta);
            }
        }
        return div_(_totalOpty, 1e18);
    }
    
    /**
     * @notice Calculate additional accrued COMP for a contributor since last accrual
     * @param supplier The address to calculate contributor rewards for
     */
    function updateSupplierRewards(address optyToken, address supplier) public {
        uint _deltaBlocksPool = sub_(getBlockNumber(),optyPoolStartBlock[optyToken]);
        uint _deltaBlocksUser = sub_(optyUserStateInPool[optyToken][supplier].block,optyPoolStartBlock[optyToken]);
        uint _supplierTokens = IERC20(optyToken).balanceOf(supplier);
        uint _supplierDelta = mul_(_supplierTokens, sub_(mul_(uint(optyPoolState[optyToken].index),_deltaBlocksPool),mul_(optyUserStateInPool[optyToken][supplier].index,_deltaBlocksUser)));
>>>>>>> OP-291
        uint _supplierAccrued = add_(optyAccrued[supplier], _supplierDelta);
        optyAccrued[supplier] = _supplierAccrued;
    }
    
<<<<<<< HEAD
=======
    function updateUserStateInPool(address optyToken, address supplier) public {
        optyUserStateInPool[optyToken][supplier].index = optyPoolState[optyToken].index;
        optyUserStateInPool[optyToken][supplier].block = optyPoolState[optyToken].block;
    }
    
    /**
     * @notice Set the OPTY rate for a specific pool
     * @return The amount of OPTY which was NOT transferred to the user
     */
    function updateOptyPoolRatePerBlockAndLPToken(address optyPool) public returns (bool) {
        optyPoolRatePerBlockAndLPToken[optyPool] = IERC20(optyPool).totalSupply() > 0 ? div_(mul_(optyPoolRatePerBlock[optyPool], 1e18), IERC20(optyPool).totalSupply()) : uint(0);
        return true;
    }
    
>>>>>>> OP-291
    /**
     * @notice Accrue OPTY to the market by updating the supply index
     * @param optyPool The market whose supply index to update
     */
<<<<<<< HEAD
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
=======
    function updateOptyPoolIndex(address optyPool) public returns(uint224) {
        if (optyPoolState[optyPool].index == uint224(0)) {
            optyPoolStartBlock[optyPool] = getBlockNumber();
            optyPoolState[optyPool].block = uint32(optyPoolStartBlock[optyPool]);
            optyPoolState[optyPool].index = uint224(optyPoolRatePerBlockAndLPToken[optyPool]);
        } else {
            uint _deltaBlocks = sub_(getBlockNumber(), uint(optyPoolState[optyPool].block));
            uint _deltaBlocksSinceStart = sub_(getBlockNumber(), optyPoolStartBlock[optyPool]);
            if (_deltaBlocks > 0) {
                uint _supplyTokens = IERC20(optyPool).totalSupply();
                uint _optyAccrued = mul_(_deltaBlocks, optyPoolRatePerBlock[optyPool]);
                uint ratio = _supplyTokens > 0 ? div_(mul_(_optyAccrued, 1e18), _supplyTokens) : uint(0);
                uint index = div_(add_(mul_(optyPoolState[optyPool].index, sub_(uint(optyPoolState[optyPool].block),optyPoolStartBlock[optyPool])), ratio), _deltaBlocksSinceStart);
                optyPoolState[optyPool] = OptyState({
                    index: safe224(index, "new index exceeds 224 bits"),
                    block: safe32(getBlockNumber(), "block number exceeds 32 bits")
                });
            }
            return optyPoolState[optyPool].index;
>>>>>>> OP-291
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
    
<<<<<<< HEAD
    function getOptyAddress() public pure returns (address) {
        return address(0);
=======
    /**
     * @notice Set the OPTY rate for a specific pool
     * @return The amount of OPTY which was NOT transferred to the user
     */
    function setOptyPoolRate(address optyPool, uint rate) public onlyOperator returns (bool) {
        optyPoolRatePerBlock[optyPool] = rate;
        return true;
    }
    
    function addOptyPool(address optyPool) public onlyOperator returns (bool) {
        for (uint i = 0; i < allOptyPools.length; i ++) {
            require(allOptyPools[i] != optyPool, "optyPool already added");
        }
        allOptyPools.push(optyPool);
    }
    
    function setOptyPool(address optyPool, bool enable) public onlyOperator returns (bool) {
        optyPoolEnabled[optyPool] = enable;
        return true;
    }
    
    function setOptyPoolStartBlock(address optyPool, uint blockNumber) public returns (bool) {
        optyPoolStartBlock[optyPool] = blockNumber;
    }
    
    function getOptyAddress() public pure returns (address) {
        return address(0xdCe3A64316E849cB063AbCC8De4dD78B231C28C7);
>>>>>>> OP-291
    }
    
    function getBlockNumber() public view returns (uint) {
        return block.number;
    }
}