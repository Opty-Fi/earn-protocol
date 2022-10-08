// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title Custom error library for LimitOrder contract suite
 * @author OptyFi
 */
library Errors {
    /**
     * @notice thrown when maker does not have an active order
     * @param _maker address of maker of order
     */
    error NoActiveOrder(address _maker);

    /**
     * @notice thrown when a given price is not within upper/lower bounds when direction of
     * bounds is 'In'
     * @param _price price to check
     * @param _lowerBound lower bound to check against
     * @param _upperBound upper bound to check against
     */
    error PriceOutwithBounds(
        uint256 _price,
        uint256 _lowerBound,
        uint256 _upperBound
    );

    /**
     * @notice thrown when a given price is within upper/lower bounds when direction of
     * bounds is 'Out'
     * @param _price price to check
     * @param _lowerBound lower bound to check against
     * @param _upperBound upper bound to check against
     */
    error PriceWithinBounds(
        uint256 _price,
        uint256 _lowerBound,
        uint256 _upperBound
    );

    /**
     * @notice thrown when lowerBound >= upperBound
     */
    error ReverseBounds();

    /**
     * @notice thrown when maker has an active order
     * @param _maker address of maker of order
     * @param _vault address of vault order pertains to
     */
    error ActiveOrder(address _maker, address _vault);

    /**
     * @notice thrown when expiration timestamp is set in past
     * @param _timestamp current timestamp
     * @param _expiration expiration timestamp
     */
    error PastExpiration(uint256 _timestamp, uint256 _expiration);

    /**
     * @notice thrown when the timestamp is past order expiration
     * @param _timestamp current timestamp
     * @param _expiration order expiration timestamp
     */
    error Expired(uint256 _timestamp, uint256 _expiration);

    /**
     * @notice thrown when an order is non-existent
     */
    error OrderNonExistent();

    /**
     * @notice thrown when returned tokens too few
     */
    error InsufficientReturn();

    /**
     * @notice thrown when destination of share/asset delivery is not whitelisted
     */
    error ForbiddenDestination();

    /**
     * @notice thrown when length of arrays are not same
     */
    error LengthMismatch();
}