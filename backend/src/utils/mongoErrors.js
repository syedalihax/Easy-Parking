const isTransactionUnsupported = (error) => {
  let currentError = error;

  while (currentError) {
    if (
      currentError.code === 20 ||
      (
        currentError.codeName === 'IllegalOperation' &&
        /transaction|retryable writes/i.test(currentError.message || '')
      )
    ) {
      return true;
    }

    currentError = currentError.originalError || currentError.cause;
  }

  return false;
};

module.exports = {
  isTransactionUnsupported,
};
