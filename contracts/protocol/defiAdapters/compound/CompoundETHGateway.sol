// SPDX-License-Identifier:MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

//  helper contracts
import { Modifiers } from "../../configuration/Modifiers.sol";

//  interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IWETH } from "../../../interfaces/misc/IWETH.sol";
import { ICompoundETHGateway } from "../../../interfaces/compound/ICompoundETHGateway.sol";
import { ICompound } from "../../../interfaces/compound/ICompound.sol";

/**
 * @title ETH gateway for opty-fi's Compound adapter
 * @author Opty.fi
 * @dev Inspired from Aave WETH gateway
 */
contract CompoundETHGateway is ICompoundETHGateway, Modifiers {
    // solhint-disable-next-line var-name-mixedcase
    IWETH internal immutable WETH;

    /**
     * @dev Sets the WETH address.
     * @param weth Address of the Wrapped Ether contract
     **/
    constructor(address weth, address _registry) public Modifiers(_registry) {
        WETH = IWETH(weth);
    }

    /**
     * @inheritdoc ICompoundETHGateway
     */
    function depositETH(
        address _vault,
        address _liquidityPool,
        uint256 _amount
    ) external override {
        IERC20(address(WETH)).transferFrom(_vault, address(this), _amount);
        WETH.withdraw(_amount);
        ICompound(_liquidityPool).mint{ value: address(this).balance }();
        IERC20(_liquidityPool).transfer(_vault, IERC20(_liquidityPool).balanceOf(address(this)));
    }

    /**
     * @inheritdoc ICompoundETHGateway
     */
    function withdrawETH(
        address _vault,
        address _liquidityPool,
        uint256 _amount
    ) external override {
        IERC20(_liquidityPool).transferFrom(_vault, address(this), _amount);
        ICompound(_liquidityPool).redeem(_amount);
        WETH.deposit{ value: address(this).balance }();
        IERC20(address(WETH)).transfer(_vault, IERC20(address(WETH)).balanceOf(address(this)));
    }

    /**
     * @inheritdoc ICompoundETHGateway
     */
    function emergencyTokenTransfer(
        address _token,
        address _to,
        uint256 _amount
    ) external override onlyOperator {
        IERC20(_token).transfer(_to, _amount);
    }

    /**
     * @inheritdoc ICompoundETHGateway
     */
    function emergencyEtherTransfer(address to, uint256 amount) external override onlyOperator {
        _safeTransferETH(to, amount);
    }

    /**
     * @inheritdoc ICompoundETHGateway
     */
    function getWETHAddress() external view override returns (address) {
        return address(WETH);
    }

    /**
     * @dev transfer ETH to an address, revert if it fails.
     * @param _to recipient of the transfer
     * @param _value the amount to send
     */
    function _safeTransferETH(address _to, uint256 _value) internal {
        // solhint-disable-next-line avoid-low-level-calls
        (bool _success, ) = _to.call{ value: _value }(new bytes(0));
        require(_success, "ETH_TRANSFER_FAILED");
    }

    /**
     * @dev Only WETH contract is allowed to transfer ETH here. Prevent other addresses to send Ether to this contract.
     */
    receive() external payable {
        require(msg.sender == address(WETH), "Receive not allowed");
    }

    /**
     * @dev Revert fallback calls
     */
    fallback() external payable {
        revert("Fallback not allowed");
    }
}
