// creating utility function for db connection in two ways with "promise" and "HigherOrder func"

// using Promise
const asyncHandler = (requstHandler) => {
  (req, res, next) => {
    Promise.resolve(requstHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// passing two function as parameter as if higher order function does. (A higher order function is taking another function as parameter.)
// const asyncHandler = (fn)=>{}
// const asyncHandler = (fn)=>()=>{}
// const asyncHandler = (fn)=>async()=>{}

// using higherOrder function
/*const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    // seding err code and json message
    res.status(err.code || 500).json({
      success: false,
      message: err.message,
    });
  }
};*/
