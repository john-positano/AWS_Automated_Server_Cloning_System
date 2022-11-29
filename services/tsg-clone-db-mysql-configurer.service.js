let SSH = require( 'simple-ssh' );
let fs = require( 'fs' );
let mysql = require( 'mysql' );
let MySQLRootPassword = process.env.MySQLRootPassword;

module.exports = class TSGMysqlConfigurerService {
  constructor ( emitter ) {
    this._emitter = emitter;

    this._sshRetryCount = 0;


    this._emitter.once( 
      'clone-db-mysql-install-success', 
      ( event ) => {
        this.connect( event, () => { this.mysqlConfig( event ); } ); 
      } 
    );
  }


  connect ( event, callback ) {
    this._ssh = new SSH(
      {
        host: event.Reservations[ 0 ].Instances[ 0 ].PublicDnsName,
        user: 'ubuntu',
        key: fs.readFileSync( __dirname + '/../TSGCloneKeyPair.pem' ),
        timeout: 10000      
      }
    );

    this._ssh.on( 'ready', callback );
    this._ssh.on( 
      'error', 
      async ( err ) => {
        this._emitter.emit( 'clone-db-error', err );
      }
    );

    this._ssh.start();
  }


  mysqlConfig ( event ) {
    let output = [];

    this._ssh
    // .exec( 'sudo mkdir /var/run/mysqld', { pty: true, err: console.log, out: console.log, exit: console.log } )
    .exec( 'sudo sed -i \'s/127.0.0.1/*/g\' /etc/mysql/mysql.conf.d/mysqld.cnf', { pty: true, err: console.log, out: console.log, exit: console.log } )
    .exec( 'sudo systemctl restart mysql && sleep 10', { pty: true, err: console.log, out: console.log, exit: console.log } )
    .exec(
      `sudo mysql -u root --password=${ MySQLRootPassword } -e "SET GLOBAL key_buffer_size = 8000000000, GLOBAL max_allowed_packet = 2000000000, GLOBAL query_cache_limit = 2000000000, GLOBAL query_cache_size = 4000000000, GLOBAL max_connections = 1000; CREATE USER 'topgolf_wp894'@'%' IDENTIFIED BY '${ MySQLRootPassword }'; GRANT ALL PRIVILEGES ON *.* TO 'topgolf_wp894'@'%'"`, 
      { 
        pty: true,
        out: ( chunk ) => { output.push( chunk ); }, 
        err: ( err ) => {
          output.push( err );
          this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-db-mysql-config-error' ), 500 );
          this._emitter.emit( 'clone-db-error', err );        
        },
        exit: ( a, b, c ) => { 
          this._ssh.end();
          this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-db-mysql-config-success' ), 200 );
          this._emitter.emit( 'clone-db-mysql-config-success', event );
        } 
      } 
    );
  }
}