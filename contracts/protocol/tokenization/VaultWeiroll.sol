// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./VM.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Constants } from "../../utils/Constants.sol";

import "hardhat/console.sol";

contract VaultWeiroll is VM, ERC20 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    // command to
    struct Inputs {
        bytes32[] commands;
        bytes[] state;
    }

    Inputs internal _oraValueUT;
    Inputs internal _lastStepBalanceLP;
    Inputs internal _depositToStrategy;

    ERC20 public underlyingToken;

    constructor(
        ERC20 _underlyingToken,
        string memory _name,
        string memory _symbol
    ) public ERC20(_name, _symbol) {
        underlyingToken = _underlyingToken;
        _setupDecimals(underlyingToken.decimals());
    }

    function setOraValueUT(bytes32[] calldata commands, bytes[] memory state) external {
        delete _oraValueUT.commands;
        delete _oraValueUT.state;
        uint256 _cLen = commands.length;
        uint256 _sLen = state.length;
        _oraValueUT.commands = new bytes32[](_cLen);
        for (uint256 _i; _i < _cLen; _i++) {
            _oraValueUT.commands[_i] = commands[_i];
        }
        _oraValueUT.state = new bytes[](_sLen);
        for (uint256 _i; _i < _sLen; _i++) {
            _oraValueUT.state[_i] = state[_i];
        }
    }

    function setLastStepBalanceLP(bytes32[] calldata commands, bytes[] memory state) external {
        delete _lastStepBalanceLP.commands;
        delete _lastStepBalanceLP.state;
        uint256 _cLen = commands.length;
        uint256 _sLen = state.length;
        _lastStepBalanceLP.commands = new bytes32[](_cLen);
        for (uint256 _i; _i < _cLen; _i++) {
            _lastStepBalanceLP.commands[_i] = commands[_i];
        }
        _lastStepBalanceLP.state = new bytes[](_sLen);
        for (uint256 _i; _i < _sLen; _i++) {
            _lastStepBalanceLP.state[_i] = state[_i];
        }
    }

    function setDepositToStrategy(bytes32[] calldata commands, bytes[] memory state) external {
        delete _depositToStrategy.commands;
        delete _depositToStrategy.state;
        uint256 _cLen = commands.length;
        uint256 _sLen = state.length;
        _depositToStrategy.commands = new bytes32[](_cLen);
        for (uint256 _i; _i < _cLen; _i++) {
            _depositToStrategy.commands[_i] = commands[_i];
        }
        _depositToStrategy.state = new bytes[](_sLen);
        for (uint256 _i; _i < _sLen; _i++) {
            _depositToStrategy.state[_i] = state[_i];
        }
    }

    function userDepositVault(uint256 _amount) external {
        underlyingToken.transferFrom(msg.sender, address(this), _amount);
        bytes[] memory _ut = _readExecute(_oraValueUT.commands, _oraValueUT.state);
        uint256 _oraVaultAndStratValuePreDepositUT = abi.decode(_ut[0], (uint256));
        uint256 _mintAmount;
        if (_oraVaultAndStratValuePreDepositUT == 0 || totalSupply() == 0) {
            _mintAmount = _amount;
        } else {
            _mintAmount = (_amount.mul(totalSupply())).div(_oraVaultAndStratValuePreDepositUT);
        }
        _mint(msg.sender, _mintAmount);
    }

    function readFn() external view returns (uint256) {
        bytes[] memory _c = _readExecute(_oraValueUT.commands, _oraValueUT.state);
        uint256 _cLen = _c.length;
        console.log("_c length ", _cLen);
        for (uint256 _i; _i < _cLen; _i++) {
            console.log("_i=", _i);
            console.logBytes(_c[_i]);
        }
        return abi.decode(_c[0], (uint256));
    }

    function getPPS() external view returns (uint256) {
        // read the last strategy step's balance
        bytes[] memory _bal = _readExecute(_lastStepBalanceLP.commands, _lastStepBalanceLP.state);
        uint256 _lastStepBalance = abi.decode(_bal[0], (uint256));
        uint256 _cashBalance = underlyingToken.balanceOf(address(this));
        // if the last strategt step's balance > 0 then execute lastStepBalanceLP
        if (_lastStepBalance > 0) {
            // get amount in token
            bytes[] memory _amt = _readExecute(_oraValueUT.commands, _oraValueUT.state);
            uint256 _amountInToken = abi.decode(_amt[0], (uint256));
            return (_amountInToken.add(_cashBalance)).mul(Constants.WEI_DECIMAL).div(totalSupply());
        } else {
            return _cashBalance.mul(Constants.WEI_DECIMAL).div(totalSupply());
        }
    }

    function getLastStrategyStepBalance() external view returns (uint256) {
        bytes[] memory _bal = _readExecute(_lastStepBalanceLP.commands, _lastStepBalanceLP.state);
        uint256 _cLen = _bal.length;
        console.log("_bal length ", _cLen);
        for (uint256 _i; _i < _cLen; _i++) {
            console.log("_i=", _i);
            console.logBytes(_bal[_i]);
        }
        return abi.decode(_bal[0], (uint256));
    }

    function vaultDepositAllToStrategy() external {
        _execute(_depositToStrategy.commands, _depositToStrategy.state);
    }

    function giveAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) external {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, "E1");
        for (uint256 _i; _i < _tokens.length; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], uint256(-1));
        }
    }

    function removeAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) external {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, "E2");
        for (uint256 _i; _i < _tokens.length; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], 0);
        }
    }
}
