// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./VM.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Constants } from "../../utils/Constants.sol";
import { EnumerableSet } from "@openzeppelin/contracts/utils/EnumerableSet.sol";

contract VaultWeiroll is VM, ERC20 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    // command to
    struct Inputs {
        bytes32[] commands;
        bytes[] state;
        uint256 outputIndex;
    }

    struct Strategy {
        bool enable;
        bytes32 hash;
        Inputs oraValueUT;
        Inputs oraValueLP;
        Inputs lastStepBalanceLP;
        Inputs depositToStrategy;
        Inputs withdrawSomeFromStrategy;
        Inputs withdrawAllFromStrategy;
    }

    mapping(uint256 => Strategy) public strategies;

    EnumerableSet.Bytes32Set internal strategiesArr;

    Inputs internal _oraValueUT;
    Inputs internal _oraValueLP;
    Inputs internal _lastStepBalanceLP;
    Inputs internal _depositToStrategy;
    Inputs internal _withdrawSomeFromStrategy;
    Inputs internal _withdrawAllFromStrategy;

    uint256 internal _cacheOraAmountLP;
    uint256 internal _cacheExpectedStratWithdrawUT;

    IERC20 public underlyingToken;

    constructor(
        IERC20 _underlyingToken,
        uint8 _decimals,
        string memory _name,
        string memory _symbol
    ) public ERC20(_name, _symbol) {
        underlyingToken = _underlyingToken;
        _setupDecimals(_decimals);
    }

    function setTemp(uint256 _index, Strategy memory _strategy) external {
        strategies[_index] = _strategy;
    }

    function setOraValueUT(
        bytes32[] calldata commands,
        bytes[] memory state,
        uint256 _outputIndex
    ) external {
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
        _oraValueUT.outputIndex = _outputIndex;
    }

    function setOraValueLP(bytes32[] calldata commands, bytes[] memory state) external {
        delete _oraValueLP.commands;
        delete _oraValueLP.state;
        uint256 _cLen = commands.length;
        uint256 _sLen = state.length;
        _oraValueLP.commands = new bytes32[](_cLen);
        for (uint256 _i; _i < _cLen; _i++) {
            _oraValueLP.commands[_i] = commands[_i];
        }
        _oraValueLP.state = new bytes[](_sLen);
        for (uint256 _i; _i < _sLen; _i++) {
            _oraValueLP.state[_i] = state[_i];
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

    function setWithdrawSomeFromStrategy(bytes32[] calldata commands, bytes[] memory state) external {
        delete _withdrawSomeFromStrategy.commands;
        delete _withdrawSomeFromStrategy.state;
        uint256 _cLen = commands.length;
        uint256 _sLen = state.length;
        _withdrawSomeFromStrategy.commands = new bytes32[](_cLen);
        for (uint256 _i; _i < _cLen; _i++) {
            _withdrawSomeFromStrategy.commands[_i] = commands[_i];
        }
        _withdrawSomeFromStrategy.state = new bytes[](_sLen);
        for (uint256 _i; _i < _sLen; _i++) {
            _withdrawSomeFromStrategy.state[_i] = state[_i];
        }
    }

    function setWithdrawAllFromStrategy(bytes32[] calldata commands, bytes[] memory state) external {
        delete _withdrawAllFromStrategy.commands;
        delete _withdrawAllFromStrategy.state;
        uint256 _cLen = commands.length;
        uint256 _sLen = state.length;
        _withdrawAllFromStrategy.commands = new bytes32[](_cLen);
        for (uint256 _i; _i < _cLen; _i++) {
            _withdrawAllFromStrategy.commands[_i] = commands[_i];
        }
        _withdrawAllFromStrategy.state = new bytes[](_sLen);
        for (uint256 _i; _i < _sLen; _i++) {
            _withdrawAllFromStrategy.state[_i] = state[_i];
        }
    }

    function userDepositVault(uint256 _amount) external {
        uint256 _oraVaultAndStratValuePreDepositUT = _oraVaultAndStratValueUT();
        underlyingToken.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _mintAmount;
        if (_oraVaultAndStratValuePreDepositUT == 0 || totalSupply() == 0) {
            _mintAmount = _amount;
        } else {
            _mintAmount = (_amount.mul(totalSupply())).div(_oraVaultAndStratValuePreDepositUT);
        }
        _mint(msg.sender, _mintAmount);
    }

    function userWithdrawVault(uint256 _amount) external {
        uint256 _oraUserWithdrawUT = _amount.mul(_oraVaultAndStratValueUT()).div(totalSupply());
        _burn(msg.sender, _amount);
        uint256 _vaultValuePreStratWithdrawUT = balanceUT();
        // if vault does not have sufficient UT, we need to withdraw from strategy
        if (_vaultValuePreStratWithdrawUT < _oraUserWithdrawUT) {
            // withdraw UT shortage from strategy
            _cacheExpectedStratWithdrawUT = _oraUserWithdrawUT.sub(_vaultValuePreStratWithdrawUT);
            _cacheOraAmountLP = _getOraSomeValueLP();
            _writeExecute(_withdrawSomeFromStrategy.commands, _withdrawSomeFromStrategy.state);
            uint256 _vaultValuePostStratWithdrawUT = balanceUT();
            uint256 _receivedStratWithdrawUT = _vaultValuePostStratWithdrawUT.sub(_vaultValuePreStratWithdrawUT);

            // If slippage occurs, reduce _oraUserWithdrawUT by slippage amount
            if (_receivedStratWithdrawUT < _cacheExpectedStratWithdrawUT) {
                _oraUserWithdrawUT = _oraUserWithdrawUT.sub(
                    _cacheExpectedStratWithdrawUT.sub(_receivedStratWithdrawUT)
                );
            }
        }
        underlyingToken.safeTransfer(msg.sender, _oraUserWithdrawUT);
    }

    function vaultWithdrawAllFromStrategy() external {
        _writeExecute(_withdrawAllFromStrategy.commands, _withdrawAllFromStrategy.state);
    }

    function getPPS() external view returns (uint256) {
        // if the last strategt step's balance > 0 then execute lastStepBalanceLP
        if (getLastStrategyStepBalance() > 0) {
            return _oraVaultAndStratValueUT().mul(Constants.WEI_DECIMAL).div(totalSupply());
        } else {
            return balanceUT().mul(Constants.WEI_DECIMAL).div(totalSupply());
        }
    }

    function getLastStrategyStepBalance() public view returns (uint256) {
        bytes[] memory _bal = _readExecute(_lastStepBalanceLP.commands, _lastStepBalanceLP.state);
        return abi.decode(_bal[_bal.length - 1], (uint256));
    }

    function balanceUT() public view returns (uint256) {
        return underlyingToken.balanceOf(address(this));
    }

    function _oraVaultAndStratValueUT() internal view returns (uint256) {
        return _getOraValueUT().add(balanceUT());
    }

    function _oraStratValueUT() internal view returns (uint256) {
        return getLastStrategyStepBalance() > 0 ? _getOraValueUT() : 0;
    }

    function _getOraValueUT() internal view returns (uint256) {
        bytes[] memory _ut = _readExecute(_oraValueUT.commands, _oraValueUT.state);
        return abi.decode(_ut[0], (uint256));
    }

    function _getOraSomeValueLP() internal view returns (uint256) {
        bytes[] memory _lp = _readExecute(_oraValueLP.commands, _oraValueLP.state);
        return abi.decode(_lp[_lp.length - 1], (uint256));
    }

    function vaultDepositAllToStrategy() external {
        _writeExecute(_depositToStrategy.commands, _depositToStrategy.state);
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

    function getCacheOraAmountLP() external view returns (uint256) {
        return _cacheOraAmountLP;
    }

    function getCacheExpectedStratWithdrawUT() external view returns (uint256) {
        return _cacheExpectedStratWithdrawUT;
    }
}
