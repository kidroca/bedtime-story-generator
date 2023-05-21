export const extractErrorMessage = (error: any) => {
  let message = 'Unknown Error';
  if (error.message) {
    message = error.message;
  } else if (error.error) {
    message = error.error;
  }

  return message;
}
