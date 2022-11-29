let SSH = require( 'simple-ssh' );
let fs = require( 'fs' );
let TSGCloneKeyPair = process.env.TSGCloneKeyPair;
let MySQLRootPassword = process.env.MySQLRootPassword;

module.exports = class TSGWPConfigEditorService {
  constructor ( emitter, event ) {
    this._event = event;
    this._emitter = emitter;

    this._emitter.on( 
      'clone-git-file-transfer-success', 
      ( event ) => { 
        this.connect( event, () => { this.replace( event ); } ); 
      } 
    );
  }

  replace ( event ) {
    this.wpConfigInitial = [];
    let logTitle = 'clone-file-wp-config';
    let output = [];

    var apachePatchStatement = `sudo sed -i "s_</VirtualHost>_</VirtualHost>\\n<Directory /var/www/html/>\\nOptions Indexes FollowSymLinks\\nAllowOverride All\\nRequire all granted\\n</Directory>_g" /etc/apache2/sites-enabled/000-default.conf`;

    this._ssh
      .exec( apachePatchStatement, { pty: true, err: console.log, exit: () => { console.log('a'); }, out: console.log } )
      .exec( `sudo sed -i "s/short_open_tag = Off/short_open_tag = On/g" /etc/php/7.2/apache2/php.ini`, { pty: true, err: console.log, exit: () => { console.log('b'); }, out: console.log } )
      .exec( `sudo sed -i "s/define('DB_HOST', '.*.')/define('DB_HOST', '${ event.DBClone.Reservations[ 0 ].Instances[ 0 ].PublicDnsName }')/g" /var/www/html/wp-config.php`, { pty: true, err: console.log, exit: () => { console.log('c'); }, out: console.log } )
      .exec( `sudo sed -i "s/define('DB_PASSWORD', '.*.')/define('DB_PASSWORD', '${ MySQLRootPassword }')/g" /var/www/html/wp-config.php`, { pty: true, err: console.log, exit: () => { console.log('e'); }, out: console.log } )
      .exec( `sudo sed "/define('DB_COLLATE', '');/a define('WP_SITEURL', 'http://${ event.Reservations[ 0 ].Instances[ 0 ].PublicDnsName }'); define('WP_HOME', 'http://${ event.Reservations[ 0 ].Instances[ 0 ].PublicDnsName }');" /var/www/html/wp-config.php`, { pty: true, err: console.log, exit: () => {}, out: console.log } )
      .exec( `sudo a2enmod ssl && sudo a2enmod rewrite && sudo systemctl restart apache2` )
      .exec( 
        'cat /var/www/html/wp-config.php',
        {
          pty: true,
          out: ( chunk ) => {
            output.push( chunk.toString() );
          },
          err: ( err ) => {
            output.push( err );
            this._emitter.emit( 'log', output.join( '\n' ), ( logTitle + '-error' ), 500 );
            this._emitter.emit( 'clone-error', err );  
          },
          exit: ( code ) => {
            if ( code != 0 ) { this.replace( event ); }
            this._emitter.emit( 'log', output.join( '\n' ), ( logTitle + '-success' ), 200 );

            this._ssh.end();
          }
        }
      );
  }

  connect ( event, callback ) {
    this._ssh = new SSH(
      {
        host: event.Reservations[ 0 ].Instances[ 0 ].PublicDnsName,
        user: 'ubuntu',
        key: TSGCloneKeyPair,
        timeout: 10000      
      }
    );

    this._ssh.on( 'ready', callback );
    this._ssh.on( 
      'error', 
      async ( err ) => {
        this._emitter.emit( 'clone-file-error', err );
      }
    );

    this._ssh.start();
  }
}