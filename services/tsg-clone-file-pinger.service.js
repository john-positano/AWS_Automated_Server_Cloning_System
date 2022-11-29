let AWS = require( 'aws-sdk' );
let EC2 = new AWS.EC2();

module.exports = class TSGCloneFilePingerService {
  constructor ( emitter ) {
    this._emitter = emitter;
    this._emitter.on( 'connect-file-clone', ( event ) => { setTimeout( () => { this.ping( event ); }, 5000 ); } );
  }

  ping ( event ) {
    let instanceId = event.Instances[ 0 ].InstanceId;
    let instanceId2 = event.DBClone.Instances[ 0 ].InstanceId;

    EC2.describeInstances( 
      { InstanceIds: [ instanceId ] },
      ( err1, data1 ) => {
        if ( err1 ) { 
          this._emitter.emit( 'log', err1, 'clone-file-ping-error', 500 ); 
          return;
        }
      
        EC2.describeInstances( 
          { InstanceIds: [ instanceId2 ] },
          ( err2, data2 ) => {
            if ( err2 ) { 
              this._emitter.emit( 'log', err2, 'clone-file-ping-error', 500 ); 
              return;
            }
        
            data1.DBClone = data2;
            data1[ 'clone-name' ] = event[ 'clone-name' ];

            this._emitter.emit( 'log', data1, 'clone-file-ping-success', 200 );
            setTimeout( () => { this._emitter.emit( 'clone-file-ping-success', data1 ); } );
          }
        );
      }
    ); 
  }
}