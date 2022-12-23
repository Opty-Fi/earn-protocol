// SPDX-License-Identifier:MIT

pragma solidity =0.8.11;

//  interfaces
import { ICompound } from "@optyfi/defi-legos/ethereum/compound/contracts/ICompound.sol";
import { IERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import { IWETH } from "@optyfi/defi-legos/interfaces/misc/contracts/IWETH.sol";
import { ISwapRouter } from "../../interfaces/uniswap/ISwapRouter.sol";
import { IOptyFiOracle } from "../../utils/optyfi-oracle/contracts/interfaces/IOptyFiOracle.sol";
import { IERC20Metadata } from "@openzeppelin/contracts-0.8.x/token/ERC20/extensions/IERC20Metadata.sol";
import { ILendingPool } from "@optyfi/defi-legos/ethereum/aave/contracts/ILendingPool.sol";
import { IAaveV1Token } from "@optyfi/defi-legos/ethereum/aave/contracts/IAaveV1Token.sol";

// libraries
import { BytesLib } from "../../utils/BytesLib.sol";

contract VaultHelperMainnet {
    using BytesLib for bytes;

    IWETH public immutable WETH;
    ISwapRouter public immutable SwapRouter;

    // solhint-disable-next-line var-name-mixedcase
    address public constant ETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    constructor(IWETH _WETH, ISwapRouter _SwapRouter) {
        WETH = _WETH;
        SwapRouter = _SwapRouter;
    }

    function pureFunctionUint256(uint256 _arg) external pure returns (uint256) {
        return _arg;
    }

    function calculateAmountInToken_Compound(address _liquidityPool, uint256 _liquidityPoolTokenAmount)
        external
        view
        returns (uint256)
    {
        return (_liquidityPoolTokenAmount * ICompound(_liquidityPool).exchangeRateStored()) / 1e18;
    }

    function calculateAmountInLPToken_Compound(address _liquidityPool, uint256 _depositAmount)
        external
        view
        returns (uint256)
    {
        return (_depositAmount * 1e18) / ICompound(_liquidityPool).exchangeRateStored();
    }

    function depositETH_Compound(address _liquidityPool, uint256 _amount) external {
        IERC20(address(WETH)).transferFrom(msg.sender, address(this), _amount);
        WETH.withdraw(_amount);
        uint256 _balanceBeforeLP = IERC20(_liquidityPool).balanceOf(address(this));
        ICompound(_liquidityPool).mint{ value: _amount }();
        uint256 _balanceAfterLP = IERC20(_liquidityPool).balanceOf(address(this));
        IERC20(_liquidityPool).transfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    function withdrawETH_Compound(address _liquidityPool, uint256 _amount) external {
        uint256 _balanceBeforeETH = address(this).balance;
        IERC20(_liquidityPool).transferFrom(msg.sender, address(this), _amount);
        ICompound(_liquidityPool).redeem(_amount);
        uint256 _balanceAfterETH = address(this).balance;
        WETH.deposit{ value: _balanceAfterETH - _balanceBeforeETH }();
        IERC20(address(WETH)).transfer(msg.sender, _balanceAfterETH - _balanceBeforeETH);
    }

    function depositETH_AaveV1(
        address _lendingPool,
        address _lpToken,
        uint256 _amount
    ) external {
        IERC20(address(WETH)).transferFrom(msg.sender, address(this), _amount);
        WETH.withdraw(_amount);
        uint256 _balanceBeforeLP = IERC20(_lpToken).balanceOf(address(this));
        ILendingPool(_lendingPool).deposit{ value: _amount }(ETH, _amount, uint16(0));
        uint256 _balanceAfterLP = IERC20(_lpToken).balanceOf(address(this));
        IERC20(_lpToken).transfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    function withdrawETH_AaveV1(address _lpToken, uint256 _amount) external {
        uint256 _balanceBeforeETH = address(this).balance;
        IERC20(_lpToken).transferFrom(msg.sender, address(this), _amount);
        IAaveV1Token(_lpToken).redeem(_amount);
        uint256 _balanceAfterETH = address(this).balance;
        WETH.deposit{ value: _balanceAfterETH - _balanceBeforeETH }();
        IERC20(address(WETH)).transfer(msg.sender, _balanceAfterETH - _balanceBeforeETH);
    }

    function exactInput_UniswapV3(
        bytes memory _path,
        uint256 _deadline,
        uint256 _amountIn,
        uint256 _amountOutMinimum
    ) external payable {
        address _inputToken = _path.toAddress(0);
        IERC20(_inputToken).transferFrom(msg.sender, address(this), _amountIn);
        SwapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: _path,
                recipient: msg.sender,
                deadline: _deadline,
                amountIn: _amountIn,
                amountOutMinimum: _amountOutMinimum
            })
        );
    }

    function getMinimumExpectedTokenOutPrice_OptyFiOracle(
        IOptyFiOracle _optyFiOracle,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _slippage
    ) external view returns (uint256) {
        uint256 _price = _optyFiOracle.getTokenPrice(_tokenIn, _tokenOut);
        require(_price > uint256(0), "!price");
        uint256 decimalsIn = uint256(IERC20Metadata(_tokenIn).decimals());
        uint256 decimalsOut = uint256(IERC20Metadata(_tokenOut).decimals());
        uint256 _amountOut = (_amountIn * _price * 10**decimalsOut) / 10**(18 + decimalsIn);
        return (_amountOut * (10000 - _slippage)) / 10000;
    }

    function getERC20Balance(IERC20 _token, address _owner) external view returns (uint256) {
        return _token.balanceOf(_owner);
    }

    receive() external payable {}
}
