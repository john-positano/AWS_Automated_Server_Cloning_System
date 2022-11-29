let mysql = require( 'mysql' );
let MySQLClonePassword = process.env.MySQLClonePassword;
let TSGDBParams = {
  host: '3.81.63.125',
  user: 'clone',
  password: MySQLClonePassword,
  database: 'clone'  
};

module.exports = class TSGCloneLoggerService {
  constructor ( emitter ) {
    this._emitter = emitter;
    this._emitter.on( 'log', async ( event, type, code ) => { await this.log( event, type, code ); } );
  }

  log ( event, type = 'log', code = 200 ) {
    let _event = ( typeof event == 'object' ) ? ( JSON.stringify( event ) ) : ( event.toString().replace( /[\u0800-\uFFFF]/g, '' ) );
  }
}
