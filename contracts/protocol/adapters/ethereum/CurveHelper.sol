// SPDX-License-Identifier:MIT

pragma solidity ^0.6.12;

//  interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IWETH } from "@optyfi/defi-legos/interfaces/misc/contracts/IWETH.sol";
import { ICurveSwap } from "@optyfi/defi-legos/ethereum/curve/contracts/interfacesV0/ICurveSwap.sol";

//  helper contracts
import { Modifiers } from "../../earn-protocol-configuration/contracts/Modifiers.sol";

// libraries
import { Errors } from "../../../utils/Errors.sol";

contract CurveHelper is Modifiers {
    using SafeERC20 for IERC20;

    /* solhint-disable no-empty-blocks*/
    constructor(address _registry) public Modifiers(_registry) {}

    /* solhint-enable no-empty-blocks*/

    // solhint-disable-next-line func-name-mixedcase
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

    // solhint-disable-next-line func-name-mixedcase
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

    // solhint-disable-next-line func-name-mixedcase
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

    // solhint-disable-next-line func-name-mixedcase
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

    // solhint-disable-next-line func-name-mixedcase
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

    // solhint-disable-next-line func-name-mixedcase
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

    // solhint-disable-next-line func-name-mixedcase
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

    // solhint-disable-next-line func-name-mixedcase
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

    // solhint-disable-next-line func-name-mixedcase
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

    // solhint-disable-next-line func-name-mixedcase
    function getMintAmount_two_coin_zero_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([_amount, 0], _isDeposit);
    }

    // solhint-disable-next-line func-name-mixedcase
    function getMintAmount_two_coin_one_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0, _amount], _isDeposit);
    }

    // solhint-disable-next-line func-name-mixedcase
    function getMintAmount_three_coin_zero_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([_amount, 0, 0], _isDeposit);
    }

    // solhint-disable-next-line func-name-mixedcase
    function getMintAmount_three_coin_one_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0, _amount, 0], _isDeposit);
    }

    // solhint-disable-next-line func-name-mixedcase
    function getMintAmount_three_coin_two_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0, 0, _amount], _isDeposit);
    }

    // solhint-disable-next-line func-name-mixedcase
    function getMintAmount_four_coin_zero_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([_amount, 0, 0, 0], _isDeposit);
    }

    // solhint-disable-next-line func-name-mixedcase
    function getMintAmount_four_coin_one_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0, _amount, 0, 0], _isDeposit);
    }

    // solhint-disable-next-line func-name-mixedcase
    function getMintAmount_four_coin_two_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0, 0, _amount, 0], _isDeposit);
    }

    // solhint-disable-next-line func-name-mixedcase
    function getMintAmount_four_coin_three_index_Curve(
        address _pool,
        uint256 _amount,
        bool _isDeposit
    ) external view returns (uint256) {
        return ICurveSwap(_pool).calc_token_amount([0, 0, 0, _amount], _isDeposit);
    }

    function getCalc_withdraw_one_coin(
        address _pool,
        uint256 _lpTokenAmount,
        int128 _index
    ) external view returns (uint256) {
        if (_lpTokenAmount > 0) {
            return ICurveSwap(_pool).calc_withdraw_one_coin(_lpTokenAmount, _index);
        }
        return 0;
    }

    function giveAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) external onlyRiskOperator {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, Errors.LENGTH_MISMATCH);
        for (uint256 _i; _i < _tokensLen; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], uint256(-1));
        }
    }

    function removeAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) external onlyRiskOperator {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, Errors.LENGTH_MISMATCH);
        for (uint256 _i; _i < _tokensLen; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], 0);
        }
    }
}
