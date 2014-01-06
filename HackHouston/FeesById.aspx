﻿<%@ Page Language="C#" AutoEventWireup="true" CodeFile="FeesById.aspx.cs" Inherits="FeesById" %>

<!DOCTYPE html>

<html>
  <head runat="server">
    <title>City of Houston Fee Schedule</title>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <link href="assets/css/bootstrap.min.css" media="screen" rel="stylesheet" type="text/css" />
    <link href="assets/css/stream.css" media="screen" rel="stylesheet" type="text/css" />
    <link href="assets/css/custom.css" media="screen" rel="stylesheet" type="text/css" />
    <script src="assets/js/libs/respond.js" type="text/javascript"></script>
  </head>
  <body runat="server">
    <form id="form1" runat="server">
        <div class="container">
          <div class="fees content col-span-6" id="fees">
          </div>
          <script id="template" type="text/html">
            <div class="col-span-12 fee">
              <div class="thumbnail">
                <span class="label label-success rating">{{<%= amountColumn %>}}</span>
                <div class="caption">
                  <h4>{{<%= nameColumn %>}}</h4>
                  <div class="detail">
                    <dl>
                      <dt>Description</dt>
                      <dd>{{<%= descriptionColumn %>}}</dd>
                      <dt>Responsible Department</dt>
                      <dd>{{<%= deptColumn %>}}</dd>
                      <dt>Statutory Authority</dt>
                      <dd>{{<%= statAuthColumn %>}}</dd>
                    </dl>
                  </div>
                </div>
                <span style="display:none;">{{<%= tagColumn %>}}</span>
                <span class="id" style="display:none;">{{<%= idColumn %>}}</span>
              </div>
            </div>
          </script>
          </div>          
          <script src="Scripts/jquery-2.0.3.min.js"></script>  
          <script src="assets/js/libs/jquery/jquery.typewatch.js" type="text/javascript"></script>
          <script src="assets/js/libs/jquery/waypoints.min.js" type="text/javascript"></script>
          <script src="vendors/mustache.js" type="text/javascript"></script>
          <script type ="text/javascript">
              var apiUrl = "<%= apiUrl %>";
              var embedUrl = "";
              var idArray = "<%= idArray %>";
          </script>
          <script src="Scripts/config.js" type="text/javascript"></script>
          <script src="assets/js/libs/json2.js" type="text/javascript"></script>
          <script src="assets/js/libs/jquery/jquery.jstorage.js" type="text/javascript"></script>
          <script src="assets/js/Handler.js" type="text/javascript"></script>
          <script src="assets/js/libs/md5.js" type="text/javascript"></script>
          <script src="assets/js/storageIds.js" type="text/javascript"></script>
          <script src="assets/js/filter.js" type="text/javascript"></script>
          <script src="assets/js/embed.js" type="text/javascript"></script>
          <script src="assets/js/stream.js" type="text/javascript"></script>
          <script src="assets/js/infinitescroll.js" type="text/javascript"></script>
      </form>
    </body>
  </html>

