export const extractErrorMessage = (error: any) => {
  let message = 'Unknown Error';
  if (typeof error?.message === 'string') {
    message = error.message;
  } else if (error?.error) {
    if (typeof error.error === 'string') {
      message = error.error;
    } else if (typeof error.error.message === 'string') {
      message = error.error.message;
    }
  }

  return message;
}
