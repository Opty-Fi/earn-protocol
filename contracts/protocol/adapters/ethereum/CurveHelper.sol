// SPDX-License-Identifier:MIT

pragma solidity =0.8.11;

//  interfaces
import { IERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/utils/SafeERC20.sol";
import { IWETH } from "@optyfi/defi-legos/interfaces/misc/contracts/IWETH.sol";
import { ICurveSwap } from "@optyfi/defi-legos/ethereum/curve/contracts/interfacesV0/ICurveSwap.sol";


contract CurveHelper {
    using SafeERC20 for IERC20;

    function addLiquidity_two_coin_zero_index_Curve(
        address _underlyingToken,
        address _pool,
        address _liquidityPoolToken,
        uint256 _amount,
        uint256 _minMintAmount
    ) external payable {
        uint256 _underlyingTokenBalanceBefore = IERC20(_underlyingToken).balanceOf(address(this));
        IERC20(_underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _underlyingTokenBalanceAfter = IERC20(_underlyingToken).balanceOf(address(this));
        uint256 _actualAmount = _underlyingTokenBalanceAfter - _underlyingTokenBalanceBefore;
        uint256 _balanceBeforeLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        ICurveSwap(_pool).add_liquidity([_actualAmount, 0], _minMintAmount);
        uint256 _balanceAfterLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    function addLiquidity_two_coin_one_index_Curve(
        address _underlyingToken,
        address _pool,
        address _liquidityPoolToken,
        uint256 _amount,
        uint256 _minMintAmount
    ) external payable {
        uint256 _underlyingTokenBalanceBefore = IERC20(_underlyingToken).balanceOf(address(this));
        IERC20(_underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _underlyingTokenBalanceAfter = IERC20(_underlyingToken).balanceOf(address(this));
        uint256 _actualAmount = _underlyingTokenBalanceAfter - _underlyingTokenBalanceBefore;
        uint256 _balanceBeforeLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        ICurveSwap(_pool).add_liquidity([0, _actualAmount], _minMintAmount);
        uint256 _balanceAfterLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    function addLiquidity_three_coin_zero_index_Curve(
        address _underlyingToken,
        address _pool,
        address _liquidityPoolToken,
        uint256 _amount,
        uint256 _minMintAmount
    ) external payable {
        uint256 _underlyingTokenBalanceBefore = IERC20(_underlyingToken).balanceOf(address(this));
        IERC20(_underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _underlyingTokenBalanceAfter = IERC20(_underlyingToken).balanceOf(address(this));
        uint256 _actualAmount = _underlyingTokenBalanceAfter - _underlyingTokenBalanceBefore;
        uint256 _balanceBeforeLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        ICurveSwap(_pool).add_liquidity([_actualAmount, 0, 0], _minMintAmount);
        uint256 _balanceAfterLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    function addLiquidity_three_coin_one_index_Curve(
        address _underlyingToken,
        address _pool,
        address _liquidityPoolToken,
        uint256 _amount,
        uint256 _minMintAmount
    ) external payable {
        uint256 _underlyingTokenBalanceBefore = IERC20(_underlyingToken).balanceOf(address(this));
        IERC20(_underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _underlyingTokenBalanceAfter = IERC20(_underlyingToken).balanceOf(address(this));
        uint256 _actualAmount = _underlyingTokenBalanceAfter - _underlyingTokenBalanceBefore;
        uint256 _balanceBeforeLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        ICurveSwap(_pool).add_liquidity([0, _actualAmount, 0], _minMintAmount);
        uint256 _balanceAfterLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    function addLiquidity_three_coin_two_index_Curve(
        address _underlyingToken,
        address _pool,
        address _liquidityPoolToken,
        uint256 _amount,
        uint256 _minMintAmount
    ) external payable {
        uint256 _underlyingTokenBalanceBefore = IERC20(_underlyingToken).balanceOf(address(this));
        IERC20(_underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _underlyingTokenBalanceAfter = IERC20(_underlyingToken).balanceOf(address(this));
        uint256 _actualAmount = _underlyingTokenBalanceAfter - _underlyingTokenBalanceBefore;
        uint256 _balanceBeforeLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        ICurveSwap(_pool).add_liquidity([0, 0, _actualAmount], _minMintAmount);
        uint256 _balanceAfterLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    function addLiquidity_four_coin_zero_index_Curve(
        address _underlyingToken,
        address _pool,
        address _liquidityPoolToken,
        uint256 _amount,
        uint256 _minMintAmount
    ) external payable {
        uint256 _underlyingTokenBalanceBefore = IERC20(_underlyingToken).balanceOf(address(this));
        IERC20(_underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _underlyingTokenBalanceAfter = IERC20(_underlyingToken).balanceOf(address(this));
        uint256 _actualAmount = _underlyingTokenBalanceAfter - _underlyingTokenBalanceBefore;
        uint256 _balanceBeforeLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        ICurveSwap(_pool).add_liquidity([_actualAmount, 0, 0, 0], _minMintAmount);
        uint256 _balanceAfterLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

        function addLiquidity_four_coin_one_index_Curve(
        address _underlyingToken,
        address _pool,
        address _liquidityPoolToken,
        uint256 _amount,
        uint256 _minMintAmount
    ) external payable {
        uint256 _underlyingTokenBalanceBefore = IERC20(_underlyingToken).balanceOf(address(this));
        IERC20(_underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _underlyingTokenBalanceAfter = IERC20(_underlyingToken).balanceOf(address(this));
        uint256 _actualAmount = _underlyingTokenBalanceAfter - _underlyingTokenBalanceBefore;
        uint256 _balanceBeforeLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        ICurveSwap(_pool).add_liquidity([0, _actualAmount, 0, 0], _minMintAmount);
        uint256 _balanceAfterLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    function addLiquidity_four_coin_two_index_Curve(
        address _underlyingToken,
        address _pool,
        address _liquidityPoolToken,
        uint256 _amount,
        uint256 _minMintAmount
    ) external payable {
        uint256 _underlyingTokenBalanceBefore = IERC20(_underlyingToken).balanceOf(address(this));
        IERC20(_underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _underlyingTokenBalanceAfter = IERC20(_underlyingToken).balanceOf(address(this));
        uint256 _actualAmount = _underlyingTokenBalanceAfter - _underlyingTokenBalanceBefore;
        uint256 _balanceBeforeLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        ICurveSwap(_pool).add_liquidity([0, 0, _actualAmount, 0], _minMintAmount);
        uint256 _balanceAfterLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    function addLiquidity_four_coin_three_index_Curve(
        address _underlyingToken,
        address _pool,
        address _liquidityPoolToken,
        uint256 _amount,
        uint256 _minMintAmount
    ) external payable {
        uint256 _underlyingTokenBalanceBefore = IERC20(_underlyingToken).balanceOf(address(this));
        IERC20(_underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _underlyingTokenBalanceAfter = IERC20(_underlyingToken).balanceOf(address(this));
        uint256 _actualAmount = _underlyingTokenBalanceAfter - _underlyingTokenBalanceBefore;
        uint256 _balanceBeforeLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        ICurveSwap(_pool).add_liquidity([0, 0, 0, _actualAmount], _minMintAmount);
        uint256 _balanceAfterLP = IERC20(_liquidityPoolToken).balanceOf(address(this));
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, _balanceAfterLP - _balanceBeforeLP);
    }

    function getMintAmount_two_coin_zero_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([_amount, 0], _isDeposit);
    }

    function getMintAmount_two_coin_one_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0, _amount], _isDeposit);
    }

    function getMintAmount_three_coin_zero_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([_amount,0,0], _isDeposit);
    }

    function getMintAmount_three_coin_one_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0,_amount,0], _isDeposit);
    }

    function getMintAmount_three_coin_two_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0,0,_amount], _isDeposit);
    }

    function getMintAmount_four_coin_zero_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([_amount,0,0,0], _isDeposit);
    }

    function getMintAmount_four_coin_one_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0,_amount,0,0], _isDeposit);
    }

    function getMintAmount_four_coin_two_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0,0,_amount,0], _isDeposit);
    }

    function getMintAmount_four_coin_three_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0,0,0,_amount], _isDeposit);
    }
}
