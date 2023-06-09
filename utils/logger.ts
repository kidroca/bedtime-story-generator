/**
 * @fileOverview
 * Logging utilities
 */
import winston from 'winston';

const scriptName = process.argv[1].replace(/\.[^/.]+$/, '');

export const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize()),
    }),
  ],
});

export function enableFileLogging() {
  logger.add(
    new winston.transports.File({
      filename: `${scriptName}.log`,
      level: 'debug',
      eol: '\n',
    })
  );
}

/**
 * Default behavior of the logger is to append to a file
 * This doesn't make sense for some scripts, so they can use this function to clear the log file
 */
export function clearLogFile() {
  return import('fs/promises').then(({ writeFile }) => writeFile(`${scriptName}.log`, ''));
}

export default logger;
