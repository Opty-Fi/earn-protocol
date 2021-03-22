// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

/**
 * @title Exponential module for storing fixed-precision decimals
 * @author Compound
 * @notice Exp is a struct which stores decimals with a fixed precision of 18 decimal places.
 *         Thus, if we wanted to store the 5.1, mantissa would store 5.1e18. That is:
 *         `Exp({mantissa: 5100000000000000000})`.
 */
contract ExponentialNoError {
    uint256 constant _expScale = 1e18;
    uint256 constant _doubleScale = 1e36;
    uint256 constant _half_expScale = _expScale / 2;
    uint256 constant _mantissaOne = _expScale;

    struct Exp {
        uint256 mantissa;
    }

    struct Double {
        uint256 mantissa;
    }

    /**
     * @dev Truncates the given exp to a whole number value.
     *      For example, _truncate(Exp{mantissa: 15 * _expScale}) = 15
     */
    function _truncate(Exp memory exp) internal pure returns (uint256) {
        // Note: We are not using careful math here as we're performing a division that cannot fail
        return exp.mantissa / _expScale;
    }

    /**
     * @dev Multiply an Exp by a scalar, then truncate to return an unsigned integer.
     */
    function _mul_ScalarTruncate(Exp memory a, uint256 scalar) internal pure returns (uint256) {
        Exp memory product = _mul_(a, scalar);
        return _truncate(product);
    }

    /**
     * @dev Multiply an Exp by a scalar, _truncate, then add an to an unsigned integer, returning an unsigned integer.
     */
    function _mul_ScalarTruncateAddUInt(
        Exp memory a,
        uint256 scalar,
        uint256 addend
    ) internal pure returns (uint256) {
        Exp memory product = _mul_(a, scalar);
        return _add_(_truncate(product), addend);
    }

    /**
     * @dev Checks if first Exp is less than second Exp.
     */
    function _lessThanExp(Exp memory left, Exp memory right) internal pure returns (bool) {
        return left.mantissa < right.mantissa;
    }

    /**
     * @dev Checks if left Exp <= right Exp.
     */
    function _lessThanOrEqualExp(Exp memory left, Exp memory right) internal pure returns (bool) {
        return left.mantissa <= right.mantissa;
    }

    /**
     * @dev Checks if left Exp > right Exp.
     */
    function _greaterThanExp(Exp memory left, Exp memory right) internal pure returns (bool) {
        return left.mantissa > right.mantissa;
    }

    /**
     * @dev returns true if Exp is exactly zero
     */
    function _isZeroExp(Exp memory value) internal pure returns (bool) {
        return value.mantissa == 0;
    }

    function _safe224(uint256 n, string memory errorMessage) internal pure returns (uint224) {
        require(n < 2**224, errorMessage);
        return uint224(n);
    }

    function _safe32(uint256 n, string memory errorMessage) internal pure returns (uint32) {
        require(n < 2**32, errorMessage);
        return uint32(n);
    }

    function _add_(Exp memory a, Exp memory b) internal pure returns (Exp memory) {
        return Exp({mantissa: _add_(a.mantissa, b.mantissa)});
    }

    function _add_(Double memory a, Double memory b) internal pure returns (Double memory) {
        return Double({mantissa: _add_(a.mantissa, b.mantissa)});
    }

    function _add_(uint256 a, uint256 b) internal pure returns (uint256) {
        return _add_(a, b, "addition overflow");
    }

    function _add_(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, errorMessage);
        return c;
    }

    function _sub_(Exp memory a, Exp memory b) internal pure returns (Exp memory) {
        return Exp({mantissa: _sub_(a.mantissa, b.mantissa)});
    }

    function _sub_(Double memory a, Double memory b) internal pure returns (Double memory) {
        return Double({mantissa: _sub_(a.mantissa, b.mantissa)});
    }

    function _sub_(uint256 a, uint256 b) internal pure returns (uint256) {
        return _sub_(a, b, "subtraction underflow");
    }

    function _sub_(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        return a - b;
    }

    function _mul_(Exp memory a, Exp memory b) internal pure returns (Exp memory) {
        return Exp({mantissa: _mul_(a.mantissa, b.mantissa) / _expScale});
    }

    function _mul_(Exp memory a, uint256 b) internal pure returns (Exp memory) {
        return Exp({mantissa: _mul_(a.mantissa, b)});
    }

    function _mul_(uint256 a, Exp memory b) internal pure returns (uint256) {
        return _mul_(a, b.mantissa) / _expScale;
    }

    function _mul_(Double memory a, Double memory b) internal pure returns (Double memory) {
        return Double({mantissa: _mul_(a.mantissa, b.mantissa) / _doubleScale});
    }

    function _mul_(Double memory a, uint256 b) internal pure returns (Double memory) {
        return Double({mantissa: _mul_(a.mantissa, b)});
    }

    function _mul_(uint256 a, Double memory b) internal pure returns (uint256) {
        return _mul_(a, b.mantissa) / _doubleScale;
    }

    function _mul_(uint256 a, uint256 b) internal pure returns (uint256) {
        return _mul_(a, b, "multiplication overflow");
    }

    function _mul_(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        if (a == 0 || b == 0) {
            return 0;
        }
        uint256 c = a * b;
        require(c / a == b, errorMessage);
        return c;
    }

    function _div_(Exp memory a, Exp memory b) internal pure returns (Exp memory) {
        return Exp({mantissa: _div_(_mul_(a.mantissa, _expScale), b.mantissa)});
    }

    function _div_(Exp memory a, uint256 b) internal pure returns (Exp memory) {
        return Exp({mantissa: _div_(a.mantissa, b)});
    }

    function _div_(uint256 a, Exp memory b) internal pure returns (uint256) {
        return _div_(_mul_(a, _expScale), b.mantissa);
    }

    function _div_(Double memory a, Double memory b) internal pure returns (Double memory) {
        return Double({mantissa: _div_(_mul_(a.mantissa, _doubleScale), b.mantissa)});
    }

    function _div_(Double memory a, uint256 b) internal pure returns (Double memory) {
        return Double({mantissa: _div_(a.mantissa, b)});
    }

    function _div_(uint256 a, Double memory b) internal pure returns (uint256) {
        return _div_(_mul_(a, _doubleScale), b.mantissa);
    }

    function _div_(uint256 a, uint256 b) internal pure returns (uint256) {
        return _div_(a, b, "divide by zero");
    }

    function _div_(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        return a / b;
    }

    function _fraction(uint256 a, uint256 b) internal pure returns (Double memory) {
        return Double({mantissa: _div_(_mul_(a, _doubleScale), b)});
    }
}
