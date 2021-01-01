// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IDepositPoolProxy.sol";
import "../../interfaces/harvest.finance/IHarvestDeposit.sol";
import "../../interfaces/harvest.finance/IHarvestFarm.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/Modifiers.sol";
import "../../Gatherer.sol";

contract HarvestDepositPoolProxy is IDepositPoolProxy,Modifiers {

    using SafeERC20 for IERC20;
    using SafeMath for uint;
    
    address public gatherer;
    address public rewardToken;
    
    mapping(address => address) public liquidityPoolToStakingPool;
    
    // deposit pool
    address public constant tBTCsBTCCrvDepositPool = address(0x640704D106E79e105FDA424f05467F005418F1B5);
    address public constant threeCrvDepositPool = address(0x71B9eC42bB3CB40F017D8AD8011BE8e384a95fa5);
    address public constant yDAIyUSDCyUSDTyTUSDDepositPool  = address(0x0FE4283e0216F94f5f9750a7a11AC54D3c9C38F3);
    address public constant fDAIDepositPool = address(0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C);
    address public constant fUSDCDepositPool = address(0xf0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE);
    address public constant fUSDTDepositPool = address(0x053c80eA73Dc6941F518a68E2FC52Ac45BDE7c9C);
    address public constant fTUSDDepositPool = address(0x7674622c63Bee7F46E86a4A5A18976693D54441b);
    address public constant fCrvRenWBTCDepositPool = address(0x9aA8F427A17d6B0d91B6262989EdC7D45d6aEdf8);
    address public constant fWBTCDepositPool = address(0x5d9d25c7C457dD82fc8668FFC6B9746b674d4EcB);
    address public constant frenBTCDepositPool = address(0xC391d1b08c1403313B0c28D47202DFDA015633C4);
    address public constant fWETHDepositPool = address(0xFE09e53A81Fe2808bc493ea64319109B5bAa573e);
    address public constant fcDAIcUSDCDepositPool = address(0x998cEb152A42a3EaC1f555B1E911642BeBf00faD);
    address public constant fusdn3CrvDepositPool = address(0x683E683fBE6Cf9b635539712c999f3B3EdCB8664);
    address public constant fyDAIyUSDCyUSDTyBUSDDepositPool = address(0x4b1cBD6F6D8676AcE5E412C78B7a59b4A1bbb68a);
    
    // staking pool
    address public constant tBTCsBTCCrvStakePool = address(0x017eC1772A45d2cf68c429A820eF374f0662C57c);
    address public constant threeCrvStakePool = address(0x27F12d1a08454402175b9F0b53769783578Be7d9);
    address public constant yDAIyUSDCyUSDTyTUSDStakePool = address(0x6D1b6Ea108AA03c6993d8010690264BA96D349A8);
    address public constant fDAIStakePool = address(0x15d3A64B2d5ab9E152F16593Cdebc4bB165B5B4A);
    address public constant fUSDCStakePool = address(0x4F7c28cCb0F1Dbd1388209C67eEc234273C878Bd);
    address public constant fUSDTStakePool = address(0x6ac4a7AB91E6fD098E13B7d347c6d4d1494994a2);
    address public constant fTUSDStakePool = address(0xeC56a21CF0D7FeB93C25587C12bFfe094aa0eCdA);
    address public constant fCrvRenWBTCStakePool = address(0xA3Cf8D1CEe996253FAD1F8e3d68BDCba7B3A3Db5);
    address public constant fWBTCStakePool = address(0x917d6480Ec60cBddd6CbD0C8EA317Bcc709EA77B);
    address public constant frenBTCStakePool = address(0x7b8Ff8884590f44e10Ea8105730fe637Ce0cb4F6);
    address public constant fWETHStakePool = address(0x3DA9D911301f8144bdF5c3c67886e5373DCdff8e);
    address public constant fcDAIcUSDCStakePool = address(0xC0f51a979e762202e9BeF0f62b07F600d0697DE1);
    address public constant fusdn3CrvStakePool = address(0xef4Da1CE3f487DA2Ed0BE23173F76274E0D47579);
    address public constant fyDAIyUSDCyUSDTyBUSDStakePool = address(0x093C2ae5E6F3D2A897459aa24551289D462449AD);
    
    Gatherer gathererContract;

    constructor(address _gatherer) public {
        setGatherer(_gatherer);
        gathererContract = Gatherer(gatherer);
        setRewardToken(address(0xa0246c9032bC3A600820415aE600c6388619A14D));
setLiquidityPoolToStakingPool(tBTCsBTCCrvDepositPool,tBTCsBTCCrvStakePool);
        setLiquidityPoolToStakingPool(threeCrvDepositPool,threeCrvStakePool);
        setLiquidityPoolToStakingPool(yDAIyUSDCyUSDTyTUSDDepositPool,yDAIyUSDCyUSDTyTUSDStakePool);
        setLiquidityPoolToStakingPool(fDAIDepositPool,fDAIStakePool);
        setLiquidityPoolToStakingPool(fUSDCDepositPool,fUSDCStakePool);
        setLiquidityPoolToStakingPool(fUSDTDepositPool,fUSDTStakePool);
        setLiquidityPoolToStakingPool(fTUSDDepositPool,fTUSDStakePool);
        setLiquidityPoolToStakingPool(fCrvRenWBTCDepositPool,fCrvRenWBTCStakePool);
        setLiquidityPoolToStakingPool(fWBTCDepositPool,fWBTCStakePool);
        setLiquidityPoolToStakingPool(frenBTCDepositPool,frenBTCStakePool);
        setLiquidityPoolToStakingPool(fWETHDepositPool,fWETHStakePool);
        setLiquidityPoolToStakingPool(fcDAIcUSDCDepositPool,fcDAIcUSDCStakePool);
        setLiquidityPoolToStakingPool(fusdn3CrvDepositPool,fusdn3CrvStakePool);
        setLiquidityPoolToStakingPool(fyDAIyUSDCyUSDTyBUSDDepositPool,fyDAIyUSDCyUSDTyBUSDStakePool);
    }
    
    function setRewardToken(address _rewardToken) public onlyGovernance {
        rewardToken = _rewardToken;
    }
    
    function setLiquidityPoolToStakingPool(address _liquidityPool, address _stakingPool) public onlyGovernance {
        require(liquidityPoolToStakingPool[_liquidityPool] != _stakingPool, "vaultToFarm already set");
        liquidityPoolToStakingPool[_liquidityPool] = _stakingPool;
    }
    
    function setGatherer(address _gatherer) public onlyGovernance {
        gatherer = _gatherer;
    }
    
    function deposit(address, address, address _liquidityPool, address, uint[] memory _amounts) public override returns(bool) {
        address _underlyingToken = _getUnderlyingToken(_liquidityPool);
        IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_underlyingToken).safeApprove(_liquidityPool, uint(_amounts[0]));
        IHarvestDeposit(_liquidityPool).deposit(_amounts[0]);
        address _stakingPool = getLiquidityPoolToStakingPool(_liquidityPool);
        IERC20(_liquidityPool).safeApprove(_stakingPool, uint(0));
        IERC20(_liquidityPool).safeApprove(_stakingPool, IERC20(_liquidityPool).balanceOf(address(this)));
        IHarvestFarm(_stakingPool).stake(IERC20(_liquidityPool).balanceOf(address(this)));
        return true;
    }

    function withdraw(address, address[] memory, address, address _liquidityPoolToken, uint) public override returns(bool) {
        address _underlyingToken = _getUnderlyingToken(_liquidityPoolToken);
        address _stakingPool = getLiquidityPoolToStakingPool(_liquidityPoolToken);
        IHarvestFarm(_stakingPool).exit();
        IERC20(rewardToken).safeApprove(gatherer, uint(0));
        IERC20(rewardToken).safeApprove(gatherer, IERC20(rewardToken).balanceOf(address(this)));
        gathererContract.harvest(rewardToken,_underlyingToken);
        IHarvestDeposit(_liquidityPoolToken).withdraw(IERC20(_liquidityPoolToken).balanceOf(address(this)));
        IERC20(_underlyingToken).safeTransfer(msg.sender, IERC20(_underlyingToken).balanceOf(address(this)));
        return true;
    }

    function balanceInToken(address, address, address _liquidityPool, address, address _holder) public override view returns(uint) {
        uint b = IHarvestFarm(getLiquidityPoolToStakingPool(_liquidityPool)).balanceOf(_holder);
        address[] memory _underlyingToken = getUnderlyingTokens(_liquidityPool, _liquidityPool);
        if (b > 0) {
            b = b.mul(IHarvestDeposit(_liquidityPool).getPricePerFullShare()).div(10**(uint256(IHarvestDeposit(_liquidityPool).decimals()))); // fToken to token
            if (IHarvestFarm(getLiquidityPoolToStakingPool(_liquidityPool)).earned(address(this))>0){
                b = b.add(gathererContract.rewardBalanceInUnderlyingTokens(rewardToken, _underlyingToken[0], IHarvestFarm(getLiquidityPoolToStakingPool(_liquidityPool)).earned(address(this))));
            }
        }
        return b;
    }
    
    /** 
    * @dev Deposits _amount of _vaultToken in _vaultFarm to generate FARM rewards
    * 
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _stakingPool Address of the farm associated to the pool
    * @param _shares Quantity of _vaultToken to deposit in the farm
    */
    function stakeLPtokens(address _liquidityPoolToken, address _stakingPool, uint _shares) public returns(bool){
        IERC20(_liquidityPoolToken).safeApprove(_stakingPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_stakingPool, uint(_shares));
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_shares);
        IHarvestFarm(_stakingPool).stake(_shares);
        return true;
    }
    
    /** 
    * @dev Withdraws _amount of _vaultToken from _vaultFarm and claims CRV rewards
    * 
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _stakingPool Address of the farm associated to the pool
    */
    function unstakeLPtokens(address _liquidityPoolToken, address _stakingPool) public returns(bool){
        IHarvestFarm(_stakingPool).exit();
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, IERC20(_liquidityPoolToken).balanceOf(address(this)));
        IERC20(rewardToken).safeTransfer(msg.sender, IERC20(rewardToken).balanceOf(address(this)));
        return true;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IHarvestDeposit(_liquidityPool).underlying();
    }
    
    function _getUnderlyingToken(address _liquidityPoolToken) internal view returns(address) {
        return IHarvestDeposit(_liquidityPoolToken).underlying();
    }
    
    function getLiquidityPoolToken(address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
    
    function getLiquidityPoolToStakingPool(address _liquidityPool) public view returns(address) {
        return liquidityPoolToStakingPool[_liquidityPool];
    }
}

// Harvest DAI vault and token = 0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C
// underlyingToken = ["0x6B175474E89094C44Da98b954EedeAC495271d0F"]
// amounts = ["15000000000000000000"]
// Harvest DAI farm = 0x15d3A64B2d5ab9E152F16593Cdebc4bB165B5B4A
