/**
 * @fileOverview
 * Logging utilities
 */
import winston, { format } from 'winston';

const scriptName = process.argv[1].replace(/\.[^/.]+$/, '');

export const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.printf((info) => {
          const { timestamp, level, message, ...args } = info;

          return `${timestamp} ${level}: ${message} ${
            Object.keys(args).length ? JSON.stringify(args, null, 2) : ''
          }`;
        })
      ),
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
